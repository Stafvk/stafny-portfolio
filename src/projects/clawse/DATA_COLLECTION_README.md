# 📊 Federal Compliance Data Collection & Storage

## Overview

This document outlines the **bulk collection strategy** for federal business compliance data using APIs and structured storage. The system collects ~2000+ federal compliance rules once, processes them with AI, and stores them locally for fast querying.

## 🏗️ Architecture

```
Federal APIs → Data Processor → AI Structurer → Database → User Queries
     ↓              ↓              ↓            ↓           ↓
Regulations.gov   Clean &        OpenAI       Firestore    <500ms
SBA API          Normalize      Structure    + Firebase   Response
Data.gov APIs   Transform      Rules        Admin SDK
```

## 📋 Data Sources

### Primary Federal APIs

| API | Coverage | Expected Rules | Rate Limit | Priority |
|-----|----------|----------------|------------|----------|
| **Regulations.gov** | All federal regulations | ~1500 | 1000/hour | HIGH |
| **SBA Data API** | Small business requirements | ~200 | No limit | HIGH |
| **Data.gov APIs** | Federal datasets | ~300 | Varies | MEDIUM |

### API Endpoints

```typescript
// Regulations.gov API
const REGULATIONS_API = {
  base_url: 'https://api.regulations.gov/v4',
  endpoints: {
    documents: '/documents',
    dockets: '/dockets',
    comments: '/comments'
  },
  auth: 'X-Api-Key header'
}

// SBA Data API  
const SBA_API = {
  base_url: 'https://data.sba.gov/api/3/action',
  endpoints: {
    datastore_search: '/datastore_search',
    package_search: '/package_search'
  },
  auth: 'None required'
}
```

## 🗄️ Database Schema (Firestore)

### Core Collections Structure

```typescript
// Main compliance rules collection
// Collection: /compliance_rules/{rule_id}
interface ComplianceRule {
  // Core Identification
  id: string;                    // Auto-generated UUID
  canonical_id: string;          // For deduplication (hash of core content)
  title: string;                 // Rule title
  description: string;           // Detailed description

  // Authority & Classification
  authority: string;             // "IRS", "DOL", "California SOS", "City of LA"
  level: 'federal' | 'state' | 'local';
  jurisdiction: string;          // "US", "CA", "Los Angeles, CA"

  // Priority & Status
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'active' | 'proposed' | 'deprecated' | 'superseded';
  superseded_by?: string;        // Rule ID that replaces this one

  // Applicability Criteria (for complex queries)
  applicability_criteria: {
    // Business Types
    business_types: string[];    // ["LLC", "Corp", "Partnership", "Sole Prop"]

    // Size Criteria
    employee_count: {
      min: number;
      max: number;
      exact?: number;            // For specific thresholds
    };

    annual_revenue: {
      min: number;
      max: number;
      currency: string;          // "USD"
    };

    // Industry & Location
    industries: string[];        // NAICS codes ["722513", "541511"]
    industry_groups: string[];   // Broader categories ["food_service", "tech"]
    states: string[];           // ["CA", "NY", "ALL"] - ALL for federal
    cities: string[];           // ["Los Angeles", "San Francisco"]
    counties: string[];         // ["Los Angeles County"]

    // Special Conditions
    special_conditions: string[]; // ["handles_personal_data", "has_physical_location", "sells_online", "has_employees", "interstate_commerce"]

    // Exclusions
    exclusions: {
      business_types?: string[];
      industries?: string[];
      states?: string[];
      conditions?: string[];
    };
  };

  // Compliance Requirements
  compliance_steps: ComplianceStep[];

  // Financial Impact
  estimated_cost: {
    filing_fees: number;
    ongoing_costs: number;       // Annual
    penalty_range: {
      min: number;
      max: number;
    };
  };

  // Timing
  deadlines: {
    initial_deadline: string;    // "Within 30 days of formation"
    recurring_deadline?: string; // "Annually by March 15"
    grace_period?: number;       // Days
  };

  // Source Information (Multiple sources possible)
  sources: ComplianceSource[];

  // Metadata
  tags: string[];              // ["tax", "registration", "federal", "employment"]
  related_rules: string[];     // IDs of related rules
  conflicts_with: string[];    // IDs of conflicting rules

  // Versioning
  version: number;
  created_at: string;          // ISO timestamp
  updated_at: string;
  last_verified: string;       // When source was last checked

  // Search Optimization
  search_keywords: string[];   // For full-text search
  search_vector?: string;      // Generated search vector
}

interface ComplianceStep {
  step_number: number;
  step_description: string;
  deadline: string;            // "Before hiring employees", "Within 30 days"
  deadline_type: 'absolute' | 'relative' | 'recurring';

  // Required Actions
  required_forms: FormReference[];
  required_documents: string[];
  online_process_url?: string;

  // Cost & Time
  estimated_cost: number;
  estimated_time: string;      // "2 hours", "1 week"

  // Dependencies
  depends_on_steps: number[];  // Other step numbers
  can_be_done_parallel: boolean;

  priority: 'critical' | 'high' | 'medium' | 'low';

  // Verification
  verification_method: string; // "Receipt required", "Certificate issued"
  completion_proof: string[];  // What documents prove completion
}

interface FormReference {
  form_name: string;           // "Form SS-4"
  form_url: string;           // Direct link to form
  form_type: 'pdf' | 'online' | 'paper';
  filing_method: 'online' | 'mail' | 'in_person';
  processing_time: string;     // "2-3 weeks"
}

interface ComplianceSource {
  source_id: string;           // Unique identifier for this source
  source_type: 'api' | 'website' | 'pdf' | 'manual';
  source_name: string;         // "Regulations.gov", "IRS.gov", "California SOS"
  source_url: string;          // Direct link to rule

  // API Source Details
  api_endpoint?: string;
  external_id?: string;        // ID in source system

  // Document Details
  document_title?: string;
  document_section?: string;   // "Section 3.2.1"
  page_number?: number;

  // Reliability
  reliability_score: number;   // 1-10 (10 = official government source)
  last_updated: string;
  verification_status: 'verified' | 'pending' | 'outdated';

  // Content Hash (for change detection)
  content_hash: string;
}
```

### Deduplication & Source Management

```typescript
// Collection: /rule_deduplication/{canonical_id}
interface RuleDeduplication {
  canonical_id: string;        // Hash of normalized rule content

  // All sources that have this rule
  source_rules: {
    rule_id: string;
    source_id: string;
    source_url: string;
    confidence_score: number;  // How confident this is the same rule
    last_seen: string;
  }[];

  // Master rule (most authoritative source)
  master_rule_id: string;

  created_at: string;
  updated_at: string;
}

// Collection: /rule_sources/{source_id}
interface RuleSource {
  source_id: string;
  source_name: string;         // "Regulations.gov API"
  source_type: 'api' | 'website' | 'pdf_collection' | 'manual_entry';

  // Source Details
  base_url: string;
  api_documentation?: string;
  contact_info?: string;

  // Reliability & Quality
  reliability_score: number;   // 1-10
  update_frequency: string;    // "daily", "weekly", "monthly"
  last_successful_sync: string;

  // Statistics
  total_rules_contributed: number;
  rules_by_level: {
    federal: number;
    state: number;
    local: number;
  };

  // Sync Configuration
  sync_enabled: boolean;
  sync_schedule: string;       // Cron expression
  sync_filters: {
    authorities: string[];
    jurisdictions: string[];
    rule_types: string[];
  };

  created_at: string;
  updated_at: string;
}

### Business Profiles Collection

```typescript
// Collection: /business_profiles/{session_id}
interface BusinessProfile {
  // Session Management
  session_id: string;
  user_email?: string;

  // Basic Business Info
  business_name: string;
  business_type: 'LLC' | 'Corp' | 'S-Corp' | 'Partnership' | 'Sole Proprietorship' | 'Non-Profit';
  formation_state?: string;    // Where business is formed

  // Size & Scale
  employee_count: number;
  annual_revenue: number;
  revenue_currency: string;    // "USD"

  // Industry Classification
  primary_industry: string;    // Primary NAICS code
  secondary_industries: string[]; // Additional NAICS codes
  industry_description: string; // Human-readable description

  // Location & Operations
  headquarters_state: string;
  headquarters_city: string;
  headquarters_county?: string;

  operating_locations: BusinessLocation[];

  // Business Activities
  business_activities: string[]; // ["retail", "online_sales", "manufacturing", "consulting"]

  // Special Characteristics
  has_physical_location: boolean;
  has_employees: boolean;
  handles_personal_data: boolean;
  processes_payments: boolean;
  sells_online: boolean;
  interstate_commerce: boolean;
  international_operations: boolean;

  // Compliance History
  existing_registrations: string[]; // ["EIN", "State Registration"]
  known_compliance_issues: string[];

  // Metadata
  created_at: string;
  updated_at: string;
  last_analysis: string;       // When compliance analysis was last run
}

interface BusinessLocation {
  address: string;
  city: string;
  state: string;
  county?: string;
  zip_code: string;
  location_type: 'headquarters' | 'branch' | 'warehouse' | 'retail';
  employee_count?: number;
}

### Compliance Analysis Results Collection

```typescript
// Collection: /compliance_analyses/{analysis_id}
interface ComplianceAnalysis {
  analysis_id: string;
  session_id: string;          // Links to business profile
  business_profile_snapshot: BusinessProfile; // Snapshot at time of analysis

  // Analysis Results
  matching_rules: MatchingRule[];
  total_rules_found: number;

  // Categorization
  rules_by_priority: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };

  rules_by_level: {
    federal: number;
    state: number;
    local: number;
  };

  // Cost Analysis
  total_estimated_cost: {
    initial_costs: number;
    annual_costs: number;
    potential_penalties: number;
  };

  // Timeline Analysis
  immediate_actions: MatchingRule[];    // Due within 30 days
  short_term_actions: MatchingRule[];   // Due within 6 months
  ongoing_requirements: MatchingRule[]; // Recurring requirements

  // Processing Info
  processing_time_seconds: number;
  data_sources_used: string[];
  ai_processing_used: boolean;

  // Status
  status: 'processing' | 'completed' | 'failed' | 'cached';
  error_message?: string;

  // Caching
  cache_key: string;           // For similar business profiles
  cache_expires_at: string;

  // Metadata
  created_at: string;
  completed_at?: string;

  // Report Generation
  pdf_report_generated: boolean;
  pdf_report_url?: string;
  email_sent: boolean;
  email_sent_at?: string;
}

interface MatchingRule {
  rule_id: string;
  rule: ComplianceRule;        // Embedded rule data
  match_confidence: number;    // 0-1 confidence score
  match_reasons: string[];     // Why this rule matched

  // Customized for this business
  applicable_steps: ComplianceStep[];
  estimated_cost_for_business: number;
  priority_for_business: 'critical' | 'high' | 'medium' | 'low';

  // Status tracking
  completion_status: 'not_started' | 'in_progress' | 'completed' | 'not_applicable';
  user_notes?: string;
}

## 🔍 Required Firestore Indexes

### Composite Indexes for Efficient Queries

```javascript
// Composite indexes needed for efficient queries
const requiredIndexes = [
  // Business profile matching
  {
    collection: 'compliance_rules',
    fields: [
      { field: 'applicability_criteria.business_types', mode: 'ARRAY' },
      { field: 'applicability_criteria.states', mode: 'ARRAY' },
      { field: 'status', mode: 'ASCENDING' },
      { field: 'priority', mode: 'ASCENDING' }
    ]
  },

  // Employee count range queries
  {
    collection: 'compliance_rules',
    fields: [
      { field: 'applicability_criteria.employee_count.min', mode: 'ASCENDING' },
      { field: 'applicability_criteria.employee_count.max', mode: 'ASCENDING' },
      { field: 'status', mode: 'ASCENDING' }
    ]
  },

  // Authority and level filtering
  {
    collection: 'compliance_rules',
    fields: [
      { field: 'authority', mode: 'ASCENDING' },
      { field: 'level', mode: 'ASCENDING' },
      { field: 'status', mode: 'ASCENDING' },
      { field: 'updated_at', mode: 'DESCENDING' }
    ]
  },

  // Industry-specific queries
  {
    collection: 'compliance_rules',
    fields: [
      { field: 'applicability_criteria.industries', mode: 'ARRAY' },
      { field: 'level', mode: 'ASCENDING' },
      { field: 'priority', mode: 'ASCENDING' }
    ]
  }
];
```

## 🔄 Data Collection Pipeline

### Phase 1: Bulk Collection (Day 1)

```typescript
// Enhanced collection orchestrator with deduplication
class FederalDataCollector {
  private deduplicationService: RuleDeduplicationService;
  private sourceRegistry: SourceRegistryService;

  async collectAllFederalData(): Promise<ComplianceRule[]> {
    const allRules: ComplianceRule[] = [];

    // 1. Regulations.gov - Core federal regulations
    console.log('Collecting from Regulations.gov...');
    const regulationsData = await this.collectRegulationsGovData();
    const processedRegulations = await this.processAndDeduplicateRules(
      regulationsData,
      'regulations_gov'
    );
    allRules.push(...processedRegulations);

    // 2. SBA API - Small business specific
    console.log('Collecting from SBA API...');
    const sbaData = await this.collectSBAData();
    const processedSBA = await this.processAndDeduplicateRules(
      sbaData,
      'sba_api'
    );
    allRules.push(...processedSBA);

    // 3. Data.gov - Additional federal datasets
    console.log('Collecting from Data.gov...');
    const dataGovData = await this.collectDataGovData();
    const processedDataGov = await this.processAndDeduplicateRules(
      dataGovData,
      'data_gov'
    );
    allRules.push(...processedDataGov);

    console.log(`Total unique rules collected: ${allRules.length}`);
    return allRules;
  }
  
  private async collectRegulationsGovData(): Promise<RawComplianceRule[]> {
    const businessTerms = [
      'small business registration',
      'business tax requirements',
      'employment compliance',
      'workplace safety',
      'business licensing',
      'environmental compliance'
    ];

    const rawRules: RawComplianceRule[] = [];

    for (const term of businessTerms) {
      const searchResults = await this.searchRegulations(term);

      for (const doc of searchResults) {
        // Get detailed document information
        const details = await this.getDocumentDetails(doc.id);

        // Convert to raw format with source info
        const rawRule = this.convertToRawRule(details, {
          source_id: 'regulations_gov',
          source_type: 'api',
          source_name: 'Regulations.gov',
          source_url: `https://www.regulations.gov/document/${doc.id}`,
          external_id: doc.id,
          reliability_score: 10,
          api_endpoint: `${this.REGULATIONS_API.base_url}/documents/${doc.id}`
        });

        rawRules.push(rawRule);

        // Respect rate limits
        await this.delay(100); // 100ms between requests
      }
    }

    return rawRules;
  }

  private async processAndDeduplicateRules(
    rawRules: RawComplianceRule[],
    sourceId: string
  ): Promise<ComplianceRule[]> {
    const processedRules: ComplianceRule[] = [];

    for (const rawRule of rawRules) {
      // Generate canonical ID for deduplication
      const canonicalId = this.generateCanonicalId(rawRule);

      // Check if rule already exists
      const existingRule = await this.deduplicationService.findExistingRule(canonicalId);

      if (existingRule) {
        // Add this source to existing rule
        await this.deduplicationService.addSourceToRule(existingRule.id, rawRule.source);
        console.log(`Added source to existing rule: ${rawRule.title}`);
      } else {
        // Create new rule
        const newRule = await this.createNewComplianceRule(rawRule, canonicalId);
        processedRules.push(newRule);

        // Update deduplication index
        await this.deduplicationService.updateIndex(canonicalId, newRule.id, rawRule.source);
        console.log(`Created new rule: ${rawRule.title}`);
      }
    }

    return processedRules;
  }

  private generateCanonicalId(rawRule: RawComplianceRule): string {
    // Create hash from normalized content for deduplication
    const hashInput = [
      rawRule.title.toLowerCase().trim(),
      rawRule.authority.toLowerCase(),
      rawRule.level,
      JSON.stringify(rawRule.applicability_criteria)
    ].join('|');

    return this.createHash(hashInput);
  }
}
```

### Phase 2: AI Processing & Structuring

```typescript
class AIRuleProcessor {
  async processAndStructureRules(rawRules: RawComplianceRule[]): Promise<ComplianceRule[]> {
    const processedRules: ComplianceRule[] = [];

    // Process in batches to manage OpenAI costs
    const batchSize = 10;

    for (let i = 0; i < rawRules.length; i += batchSize) {
      const batch = rawRules.slice(i, i + batchSize);

      const batchPrompt = this.createEnhancedBatchPrompt(batch);
      const structuredBatch = await this.callOpenAI(batchPrompt);

      // Enhance with source information and metadata
      const enhancedBatch = structuredBatch.map(rule => this.enhanceRuleWithMetadata(rule, batch));

      processedRules.push(...enhancedBatch);

      console.log(`Processed batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(rawRules.length/batchSize)}`);
    }

    return processedRules;
  }
  
  private createEnhancedBatchPrompt(rules: RawComplianceRule[]): string {
    return `
    Extract business compliance requirements from these federal regulations.
    For each regulation, provide comprehensive structured data:

    1. Clear title and description
    2. Detailed applicability criteria with specific thresholds
    3. Step-by-step compliance requirements with forms and deadlines
    4. Cost estimates and penalties
    5. Priority classification

    Regulations to process:
    ${rules.map(r => `
    Title: ${r.title}
    Authority: ${r.authority}
    Source: ${r.source.source_name}
    Content: ${r.content}
    `).join('\n---\n')}

    Return as JSON array with this enhanced structure:
    {
      "rules": [
        {
          "title": "string",
          "description": "string",
          "authority": "string",
          "level": "federal|state|local",
          "priority": "critical|high|medium|low",
          "status": "active",
          "applicability_criteria": {
            "business_types": ["LLC", "Corp", "Partnership"],
            "employee_count": {"min": 1, "max": 500},
            "annual_revenue": {"min": 0, "max": 1000000, "currency": "USD"},
            "industries": ["722513", "541511"],
            "states": ["ALL"] or ["CA", "NY"],
            "special_conditions": ["has_employees", "handles_personal_data"]
          },
          "compliance_steps": [
            {
              "step_number": 1,
              "step_description": "string",
              "deadline": "string",
              "deadline_type": "relative|absolute|recurring",
              "required_forms": [
                {
                  "form_name": "Form SS-4",
                  "form_url": "https://...",
                  "form_type": "online|pdf|paper",
                  "filing_method": "online|mail|in_person"
                }
              ],
              "estimated_cost": 0,
              "estimated_time": "15 minutes",
              "priority": "critical|high|medium|low"
            }
          ],
          "estimated_cost": {
            "filing_fees": 0,
            "ongoing_costs": 0,
            "penalty_range": {"min": 50, "max": 500}
          },
          "tags": ["tax", "registration", "federal"],
          "search_keywords": ["EIN", "employer", "identification"]
        }
      ]
    }
    `;
  }

  private enhanceRuleWithMetadata(rule: any, rawRules: RawComplianceRule[]): ComplianceRule {
    const matchingRawRule = rawRules.find(r => r.title === rule.title);

    return {
      ...rule,
      id: this.generateUUID(),
      canonical_id: this.generateCanonicalId(matchingRawRule),
      jurisdiction: this.determineJurisdiction(rule.level, rule.authority),
      sources: [matchingRawRule.source],
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_verified: new Date().toISOString()
    };
  }
}
```

### Phase 3: Firestore Database Storage

```typescript
class FirestoreManager {
  private db = getFirestore();

  async storeBulkRules(rules: ComplianceRule[]): Promise<void> {
    const batchSize = 500; // Firestore batch limit

    for (let i = 0; i < rules.length; i += batchSize) {
      const batch = rules.slice(i, i + batchSize);
      const firestoreBatch = this.db.batch();

      for (const rule of batch) {
        // Create rule document
        const ruleRef = this.db.collection('compliance_rules').doc(rule.id);
        firestoreBatch.set(ruleRef, {
          ...rule,
          // Ensure proper Firestore timestamp format
          created_at: admin.firestore.FieldValue.serverTimestamp(),
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });

        // Update deduplication index
        const dedupeRef = this.db.collection('rule_deduplication').doc(rule.canonical_id);
        firestoreBatch.set(dedupeRef, {
          canonical_id: rule.canonical_id,
          source_rules: admin.firestore.FieldValue.arrayUnion({
            rule_id: rule.id,
            source_id: rule.sources[0].source_id,
            source_url: rule.sources[0].source_url,
            confidence_score: 1.0,
            last_seen: new Date().toISOString()
          }),
          master_rule_id: rule.id,
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        // Update source registry
        for (const source of rule.sources) {
          const sourceRef = this.db.collection('rule_sources').doc(source.source_id);
          firestoreBatch.set(sourceRef, {
            source_id: source.source_id,
            source_name: source.source_name,
            source_type: source.source_type,
            base_url: source.source_url,
            reliability_score: source.reliability_score,
            total_rules_contributed: admin.firestore.FieldValue.increment(1),
            last_successful_sync: admin.firestore.FieldValue.serverTimestamp(),
            updated_at: admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
        }
      }

      // Commit batch
      await firestoreBatch.commit();
      console.log(`Stored batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(rules.length/batchSize)}`);
    }
  }

  async updateRuleWithNewSource(ruleId: string, newSource: ComplianceSource): Promise<void> {
    const ruleRef = this.db.collection('compliance_rules').doc(ruleId);

    await ruleRef.update({
      sources: admin.firestore.FieldValue.arrayUnion(newSource),
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
      last_verified: new Date().toISOString()
    });
  }
}
```

## 🔍 Firestore Query System

### Fast Business Profile Matching

```typescript
class ComplianceQueryEngine {
  private db = getFirestore();

  async getMatchingRules(businessProfile: BusinessProfile): Promise<ComplianceRule[]> {
    const matchingRules: ComplianceRule[] = [];

    // Primary query - business type and state matching
    const primaryQuery = this.db.collection('compliance_rules')
      .where('applicability_criteria.business_types', 'array-contains', businessProfile.business_type)
      .where('applicability_criteria.states', 'array-contains-any', [businessProfile.headquarters_state, 'ALL'])
      .where('status', '==', 'active')
      .orderBy('priority')
      .limit(100);

    const primaryResults = await primaryQuery.get();

    // Filter by employee count and revenue (client-side filtering due to Firestore limitations)
    const filteredResults = primaryResults.docs.filter(doc => {
      const rule = doc.data() as ComplianceRule;
      const criteria = rule.applicability_criteria;

      // Employee count check
      const employeeMatch = criteria.employee_count.min <= businessProfile.employee_count &&
                           criteria.employee_count.max >= businessProfile.employee_count;

      // Revenue check
      const revenueMatch = criteria.annual_revenue.min <= businessProfile.annual_revenue &&
                          criteria.annual_revenue.max >= businessProfile.annual_revenue;

      // Industry check
      const industryMatch = criteria.industries.length === 0 ||
                           criteria.industries.includes(businessProfile.primary_industry) ||
                           businessProfile.secondary_industries.some(ind => criteria.industries.includes(ind));

      // Special conditions check
      const specialConditionsMatch = this.checkSpecialConditions(criteria.special_conditions, businessProfile);

      return employeeMatch && revenueMatch && industryMatch && specialConditionsMatch;
    });

    // Convert to ComplianceRule objects
    filteredResults.forEach(doc => {
      matchingRules.push({
        id: doc.id,
        ...doc.data() as ComplianceRule
      });
    });

    // Secondary query for industry-specific rules
    if (businessProfile.primary_industry) {
      const industryQuery = this.db.collection('compliance_rules')
        .where('applicability_criteria.industries', 'array-contains', businessProfile.primary_industry)
        .where('status', '==', 'active')
        .orderBy('priority')
        .limit(50);

      const industryResults = await industryQuery.get();

      // Add industry-specific rules (avoiding duplicates)
      industryResults.docs.forEach(doc => {
        const ruleId = doc.id;
        if (!matchingRules.find(rule => rule.id === ruleId)) {
          matchingRules.push({
            id: ruleId,
            ...doc.data() as ComplianceRule
          });
        }
      });
    }

    // Sort by priority
    return this.sortRulesByPriority(matchingRules);
  }

  private checkSpecialConditions(conditions: string[], profile: BusinessProfile): boolean {
    if (!conditions || conditions.length === 0) return true;

    const profileConditions = [];
    if (profile.has_employees) profileConditions.push('has_employees');
    if (profile.handles_personal_data) profileConditions.push('handles_personal_data');
    if (profile.has_physical_location) profileConditions.push('has_physical_location');
    if (profile.sells_online) profileConditions.push('sells_online');
    if (profile.interstate_commerce) profileConditions.push('interstate_commerce');

    return conditions.some(condition => profileConditions.includes(condition));
  }

  private sortRulesByPriority(rules: ComplianceRule[]): ComplianceRule[] {
    const priorityOrder = { 'critical': 1, 'high': 2, 'medium': 3, 'low': 4 };

    return rules.sort((a, b) => {
      const aPriority = priorityOrder[a.priority] || 5;
      const bPriority = priorityOrder[b.priority] || 5;

      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      // Secondary sort by level (federal first)
      const levelOrder = { 'federal': 1, 'state': 2, 'local': 3 };
      const aLevel = levelOrder[a.level] || 4;
      const bLevel = levelOrder[b.level] || 4;

      return aLevel - bLevel;
    });
  }
}
```

## 📅 Update Strategy

### Weekly Update Job with Deduplication

```typescript
class DataUpdateManager {
  private deduplicationService: RuleDeduplicationService;
  private db = getFirestore();

  async runWeeklyUpdate(): Promise<void> {
    const lastUpdate = await this.getLastUpdateDate();

    // Check for new regulations since last update
    const newRegulations = await this.regulationsAPI.getDocuments({
      filter: {
        postedDate: { ge: lastUpdate }
      }
    });

    if (newRegulations.length > 0) {
      console.log(`Found ${newRegulations.length} new regulations`);

      // Process and check for duplicates
      const processedRules = await this.processNewRules(newRegulations);

      // Update source registry
      await this.updateSourceRegistry('regulations_gov', newRegulations.length);

      // Update last update timestamp
      await this.updateLastUpdateDate();

      console.log(`Processed ${processedRules.length} new unique rules`);
    }
  }

  private async processNewRules(newRegulations: any[]): Promise<ComplianceRule[]> {
    const newRules: ComplianceRule[] = [];

    for (const regulation of newRegulations) {
      // Convert to raw rule format
      const rawRule = this.convertToRawRule(regulation, {
        source_id: 'regulations_gov',
        source_type: 'api',
        source_name: 'Regulations.gov',
        source_url: `https://www.regulations.gov/document/${regulation.id}`,
        external_id: regulation.id,
        reliability_score: 10
      });

      // Generate canonical ID
      const canonicalId = this.generateCanonicalId(rawRule);

      // Check for existing rule
      const existingRule = await this.deduplicationService.findExistingRule(canonicalId);

      if (existingRule) {
        // Update existing rule with new source
        await this.updateExistingRuleSource(existingRule.id, rawRule.source);
        console.log(`Updated existing rule: ${rawRule.title}`);
      } else {
        // Process with AI and create new rule
        const processedRule = await this.aiProcessor.processRule(rawRule);
        const newRule = await this.createNewRule(processedRule, canonicalId);

        newRules.push(newRule);
        console.log(`Created new rule: ${rawRule.title}`);
      }
    }

    return newRules;
  }

  private async updateSourceRegistry(sourceId: string, newRulesCount: number): Promise<void> {
    const sourceRef = this.db.collection('rule_sources').doc(sourceId);

    await sourceRef.update({
      total_rules_contributed: admin.firestore.FieldValue.increment(newRulesCount),
      last_successful_sync: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });
  }

  private async updateExistingRuleSource(ruleId: string, newSource: ComplianceSource): Promise<void> {
    const ruleRef = this.db.collection('compliance_rules').doc(ruleId);

    // Check if source already exists
    const ruleDoc = await ruleRef.get();
    const ruleData = ruleDoc.data() as ComplianceRule;

    const existingSourceIndex = ruleData.sources.findIndex(s => s.source_id === newSource.source_id);

    if (existingSourceIndex >= 0) {
      // Update existing source
      ruleData.sources[existingSourceIndex] = {
        ...ruleData.sources[existingSourceIndex],
        last_updated: new Date().toISOString(),
        verification_status: 'verified'
      };
    } else {
      // Add new source
      ruleData.sources.push(newSource);
    }

    await ruleRef.update({
      sources: ruleData.sources,
      last_verified: new Date().toISOString(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });
  }
}
```

## 🚀 Implementation Timeline

### Day 1: Setup & Initial Collection
- [ ] Set up Firestore collections and indexes
- [ ] Initialize Firebase Admin SDK
- [ ] Implement API collectors with deduplication
- [ ] Run initial bulk collection (~2000 rules)

### Day 2: AI Processing & Storage
- [ ] Process raw data with OpenAI gpt-5-nano
- [ ] Structure and store in Firestore with proper schema
- [ ] Implement deduplication and source tracking
- [ ] Set up rule versioning system

### Day 3-6: Integration & Optimization
- [ ] Implement Firestore query engine with composite indexes
- [ ] Integrate with React frontend
- [ ] Add real-time caching with business profile matching
- [ ] Implement weekly update mechanism with conflict resolution
- [ ] Set up PDF report generation and email delivery

## 💰 Cost Estimates

### One-time Setup Costs
- **OpenAI API**: ~$50-100 (processing 2000 rules with gpt-5-nano)
- **API calls**: ~$10 (within free tiers for federal APIs)
- **Firestore**: $0 (within free tier for initial setup)

### Ongoing Costs
- **Weekly updates**: ~$5-10/month (OpenAI API for new rules)
- **Firestore storage**: ~$1-5/month (document storage and reads)
- **Firestore operations**: ~$5-15/month (reads/writes for user queries)
- **Total monthly**: ~$11-30

## 🔧 Environment Setup

```bash
# Install dependencies
npm install firebase-admin openai axios crypto

# Environment variables
REGULATIONS_API_KEY=your_api_key
OPENAI_API_KEY=your_openai_key
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY=your_private_key
FIREBASE_CLIENT_EMAIL=your_client_email

# Firestore indexes (create these in Firebase Console)
# Use the composite indexes defined above in the "Required Firestore Indexes" section

# Initialize Firebase Admin SDK
const admin = require('firebase-admin');
const serviceAccount = require('./path/to/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: process.env.FIREBASE_PROJECT_ID
});

# Run initial collection
npm run collect:federal-data
```

## 🎯 Key Improvements in Updated Structure

### **1. Deduplication System**
- **Canonical ID generation** prevents duplicate rules from multiple sources
- **Source tracking** maintains links to all sources for the same rule
- **Master rule concept** identifies the most authoritative version

### **2. Enhanced Source Management**
- **Multiple sources per rule** with reliability scoring
- **Source verification status** tracking
- **Direct links** to original sources for user verification
- **API endpoint tracking** for automated updates

### **3. Firestore Optimization**
- **Composite indexes** for efficient querying
- **Batch operations** for bulk data operations
- **Client-side filtering** for complex criteria (employee count, revenue)
- **Incremental field updates** using FieldValue operations

### **4. Improved AI Processing**
- **Enhanced prompts** with detailed structure requirements
- **Form reference extraction** with direct links
- **Cost estimation** and penalty information
- **Metadata enhancement** with versioning and timestamps

### **5. Real-time Update Capability**
- **Incremental updates** without full re-processing
- **Source registry maintenance** for tracking contributions
- **Change detection** using content hashing
- **Conflict resolution** for overlapping rules

## 📚 Related Documentation

This document is synchronized with:
- **DATABASE_SCHEMA_README.md** - Complete database schema definitions and query patterns
- Both files use identical interface definitions and Firestore collections
- Both files are optimized for OpenAI gpt-5-nano processing and Firestore storage

## 🔄 Schema Synchronization Status

✅ **ComplianceRule interface** - Fully synchronized with all fields
✅ **ComplianceStep interface** - Fully synchronized with dependencies and verification
✅ **ComplianceSource interface** - Fully synchronized with document details
✅ **RuleSource interface** - Fully synchronized with sync configuration
✅ **BusinessProfile interface** - Added and synchronized
✅ **ComplianceAnalysis interface** - Added and synchronized
✅ **Firestore indexes** - Added and synchronized
✅ **Architecture diagram** - Updated to show Firestore + OpenAI

This enhanced structure provides robust deduplication, comprehensive source tracking, and efficient querying while maintaining the ability to scale to thousands of compliance rules across multiple jurisdictions using Firestore and OpenAI gpt-5-nano.
