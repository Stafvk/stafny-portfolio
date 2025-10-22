# 🗄️ Database Schema & Data Structure Guide

## Overview

This document defines the complete database schema for the Business Compliance Platform, designed to handle federal, state, and local compliance rules with efficient querying, deduplication, and source tracking.

## 🏗️ Core Design Principles

1. **Deduplication**: Prevent duplicate rules across sources
2. **Source Tracking**: Maintain links to original sources for verification
3. **Flexible Querying**: Support complex business profile matching
4. **Scalability**: Handle 10,000+ rules efficiently
5. **Versioning**: Track rule changes over time
6. **Multi-level Support**: Federal, state, and local rules

## 📊 Database Collections Structure

### 1. Compliance Rules Collection

```typescript
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
  
  // Applicability Criteria (JSONB for complex queries)
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

### 2. Business Profiles Collection

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
```

### 3. Compliance Analysis Results Collection

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
```

### 4. Rule Sources Registry

```typescript
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
```

### 5. Deduplication Index

```typescript
// Collection: /rule_deduplication/{canonical_id}
interface RuleDeduplication {
  canonical_id: string;        // Hash of normalized rule content
  
  // All sources that have this rule
  source_rules: {
    rule_id: string;
    source_id: string;
    source_url: string;
    confidence_score: number;  // How confident we are this is the same rule
    last_seen: string;
  }[];
  
  // Master rule (most authoritative source)
  master_rule_id: string;
  
  // Content hash components
  title_normalized: string;
  description_normalized: string;
  authority_normalized: string;
  
  created_at: string;
  updated_at: string;
}
```

## 🔍 Query Patterns & Indexes

### Primary Query Patterns

```typescript
// 1. Find rules for business profile
const businessMatchQuery = {
  where: [
    ['applicability_criteria.business_types', 'array-contains', businessType],
    ['applicability_criteria.employee_count.min', '<=', employeeCount],
    ['applicability_criteria.employee_count.max', '>=', employeeCount],
    ['applicability_criteria.states', 'array-contains-any', [state, 'ALL']],
    ['status', '==', 'active']
  ],
  orderBy: [
    ['priority', 'asc'],
    ['level', 'asc'],
    ['updated_at', 'desc']
  ]
};

// 2. Find rules by authority
const authorityQuery = {
  where: [
    ['authority', '==', 'IRS'],
    ['level', '==', 'federal'],
    ['status', '==', 'active']
  ]
};

// 3. Find rules by industry
const industryQuery = {
  where: [
    ['applicability_criteria.industries', 'array-contains', naicsCode],
    ['status', '==', 'active']
  ]
};

// 4. Full-text search
const searchQuery = {
  where: [
    ['search_keywords', 'array-contains-any', searchTerms],
    ['status', '==', 'active']
  ]
};
```

### Required Firestore Indexes

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

## 🔄 Data Ingestion Pipeline

### Rule Processing Workflow

```typescript
class RuleIngestionPipeline {
  async ingestRule(rawRule: any, sourceInfo: ComplianceSource): Promise<string> {
    // 1. Normalize and clean data
    const normalizedRule = this.normalizeRule(rawRule);
    
    // 2. Generate canonical ID for deduplication
    const canonicalId = this.generateCanonicalId(normalizedRule);
    
    // 3. Check for existing rule
    const existingRule = await this.findExistingRule(canonicalId);
    
    if (existingRule) {
      // 4a. Update existing rule with new source
      return await this.addSourceToExistingRule(existingRule.id, sourceInfo);
    } else {
      // 4b. Create new rule
      const ruleId = await this.createNewRule(normalizedRule, sourceInfo);
      
      // 5. Update deduplication index
      await this.updateDeduplicationIndex(canonicalId, ruleId, sourceInfo);
      
      return ruleId;
    }
  }
  
  private generateCanonicalId(rule: any): string {
    // Create hash from normalized title, authority, and core requirements
    const hashInput = [
      rule.title.toLowerCase().trim(),
      rule.authority.toLowerCase(),
      rule.level,
      JSON.stringify(rule.applicability_criteria)
    ].join('|');
    
    return this.createHash(hashInput);
  }
}
```

## 🚀 Implementation Examples

### Adding a New Rule with Multiple Sources

```typescript
// Example: EIN requirement found in multiple sources
const einRule = {
  title: "Employer Identification Number (EIN) Registration",
  description: "All businesses with employees must obtain an EIN from the IRS",
  authority: "IRS",
  level: "federal",
  priority: "critical",

  applicability_criteria: {
    business_types: ["LLC", "Corp", "Partnership"],
    employee_count: { min: 1, max: 999999 },
    annual_revenue: { min: 0, max: 999999999 },
    states: ["ALL"],
    special_conditions: ["has_employees"]
  },

  sources: [
    {
      source_id: "irs_gov_ss4",
      source_type: "website",
      source_name: "IRS.gov",
      source_url: "https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online",
      reliability_score: 10,
      verification_status: "verified"
    },
    {
      source_id: "sba_gov_ein",
      source_type: "website",
      source_name: "SBA.gov",
      source_url: "https://www.sba.gov/business-guide/launch-your-business/get-federal-tax-id-ein",
      reliability_score: 9,
      verification_status: "verified"
    }
  ],

  compliance_steps: [
    {
      step_number: 1,
      step_description: "Complete Form SS-4 online or by mail",
      deadline: "Before hiring first employee",
      deadline_type: "relative",
      required_forms: [
        {
          form_name: "Form SS-4",
          form_url: "https://www.irs.gov/pub/irs-pdf/fss4.pdf",
          form_type: "online",
          filing_method: "online",
          processing_time: "Immediate online, 4-5 weeks by mail"
        }
      ],
      estimated_cost: 0,
      estimated_time: "15 minutes",
      priority: "critical"
    }
  ]
};
```

### Querying Rules for a Specific Business

```typescript
// Query for a California LLC restaurant with 5 employees
const queryBusinessRules = async (businessProfile: BusinessProfile) => {
  const db = getFirestore();

  // Primary query - exact matches
  const exactMatches = await db.collection('compliance_rules')
    .where('applicability_criteria.business_types', 'array-contains', businessProfile.business_type)
    .where('applicability_criteria.states', 'array-contains-any', [businessProfile.headquarters_state, 'ALL'])
    .where('status', '==', 'active')
    .where('applicability_criteria.employee_count.min', '<=', businessProfile.employee_count)
    .where('applicability_criteria.employee_count.max', '>=', businessProfile.employee_count)
    .orderBy('priority')
    .get();

  // Secondary query - industry-specific
  const industryMatches = await db.collection('compliance_rules')
    .where('applicability_criteria.industries', 'array-contains', businessProfile.primary_industry)
    .where('status', '==', 'active')
    .orderBy('priority')
    .get();

  // Combine and deduplicate results
  const allRules = [...exactMatches.docs, ...industryMatches.docs];
  const uniqueRules = deduplicateRules(allRules);

  return uniqueRules.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};
```

### Handling Rule Updates and Versioning

```typescript
class RuleVersionManager {
  async updateRule(ruleId: string, updates: Partial<ComplianceRule>, sourceInfo: ComplianceSource) {
    const db = getFirestore();
    const ruleRef = db.collection('compliance_rules').doc(ruleId);

    // Get current rule
    const currentRule = await ruleRef.get();
    if (!currentRule.exists) throw new Error('Rule not found');

    const currentData = currentRule.data() as ComplianceRule;

    // Create new version
    const newVersion = {
      ...currentData,
      ...updates,
      version: currentData.version + 1,
      updated_at: new Date().toISOString(),
      last_verified: new Date().toISOString(),

      // Add new source if not already present
      sources: this.mergeSource(currentData.sources, sourceInfo)
    };

    // Update rule
    await ruleRef.update(newVersion);

    // Log version history
    await db.collection('rule_versions').add({
      rule_id: ruleId,
      version: newVersion.version,
      changes: this.calculateChanges(currentData, newVersion),
      updated_by: sourceInfo.source_id,
      updated_at: new Date().toISOString()
    });

    return newVersion;
  }

  private mergeSource(existingSources: ComplianceSource[], newSource: ComplianceSource): ComplianceSource[] {
    const existingIndex = existingSources.findIndex(s => s.source_id === newSource.source_id);

    if (existingIndex >= 0) {
      // Update existing source
      existingSources[existingIndex] = {
        ...existingSources[existingIndex],
        ...newSource,
        last_updated: new Date().toISOString()
      };
      return existingSources;
    } else {
      // Add new source
      return [...existingSources, newSource];
    }
  }
}
```

## 📈 Performance Optimization

### Caching Strategy

```typescript
// Cache frequently accessed rules
const cacheConfig = {
  // Cache business profile matches for 24 hours
  business_matches: {
    ttl: 24 * 60 * 60, // 24 hours
    key_pattern: "business:{business_type}:{state}:{industry}:{employee_range}"
  },

  // Cache rule details for 7 days
  rule_details: {
    ttl: 7 * 24 * 60 * 60, // 7 days
    key_pattern: "rule:{rule_id}:{version}"
  },

  // Cache search results for 1 hour
  search_results: {
    ttl: 60 * 60, // 1 hour
    key_pattern: "search:{query_hash}"
  }
};
```

### Data Archival Strategy

```typescript
// Archive old rule versions and analyses
const archivalPolicy = {
  rule_versions: {
    keep_latest: 10, // Keep last 10 versions
    archive_after_days: 365
  },

  compliance_analyses: {
    archive_after_days: 90, // Archive after 3 months
    delete_after_days: 365  // Delete after 1 year
  },

  business_profiles: {
    anonymize_after_days: 30, // Remove PII after 30 days
    delete_after_days: 365
  }
};
```

## 🔒 Data Validation Rules

```typescript
// Validation schemas for data integrity
const validationRules = {
  compliance_rule: {
    required_fields: ['title', 'authority', 'level', 'applicability_criteria'],

    field_constraints: {
      priority: ['critical', 'high', 'medium', 'low'],
      level: ['federal', 'state', 'local'],
      status: ['active', 'proposed', 'deprecated', 'superseded']
    },

    business_logic: [
      'employee_count.min <= employee_count.max',
      'annual_revenue.min <= annual_revenue.max',
      'sources.length > 0',
      'compliance_steps.length > 0'
    ]
  }
};
```

## 📚 Related Documentation

This document is synchronized with:
- **DATA_COLLECTION_README.md** - Implementation details for data collection pipeline using these schemas
- Both files use identical interface definitions and Firestore collections
- Both files are optimized for OpenAI gpt-5-nano processing and Firestore storage

## 🔄 Schema Synchronization Status

✅ **All interfaces synchronized** - ComplianceRule, ComplianceStep, ComplianceSource, RuleSource, BusinessProfile, ComplianceAnalysis
✅ **Firestore collections** - All collections defined and indexed properly
✅ **Query patterns** - Optimized for Firestore composite indexes
✅ **Implementation examples** - Updated to use complete schema definitions

This comprehensive schema handles all scenarios including deduplication, multi-source tracking, versioning, and efficient querying for your compliance platform using Firestore and OpenAI gpt-5-nano.

