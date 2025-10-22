export interface ComplianceRule {
  id: string;
  canonical_id: string;
  title: string;
  description: string;
  
  // Authority & Classification
  authority: string; // "IRS", "DOL", "California SOS", "City of LA"
  level: 'federal' | 'state' | 'local';
  jurisdiction: string; // "US", "CA", "Los Angeles, CA"
  
  // Priority & Status
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'active' | 'proposed' | 'deprecated' | 'superseded';
  superseded_by?: string; // Rule ID that replaces this one
  
  // Applicability Criteria
  applicability_criteria: {
    business_types: string[]; // ["LLC", "Corp", "Partnership", "Sole Prop"]
    employee_count: {
      min: number;
      max: number;
      exact?: number; // For specific thresholds
    };
    annual_revenue: {
      min: number;
      max: number;
      currency: string; // "USD"
    };
    industries: string[]; // NAICS codes ["722513", "541511"]
    industry_groups: string[]; // Broader categories ["food_service", "tech"]
    states: string[]; // ["CA", "NY", "ALL"] - ALL for federal
    cities: string[]; // ["Los Angeles", "San Francisco"]
    counties: string[]; // ["Los Angeles County"]
    special_conditions: string[]; // ["handles_personal_data", "has_physical_location"]
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
    ongoing_costs: number; // Annual
    penalty_range: {
      min: number;
      max: number;
    };
  };
  
  // Timing
  deadlines: {
    initial_deadline: string; // "Within 30 days of formation"
    recurring_deadline?: string; // "Annually by March 15"
    grace_period?: number; // Days
  };
  
  // Source Information
  sources: ComplianceSource[];
  
  // Metadata
  tags: string[]; // ["tax", "registration", "federal", "employment"]
  related_rules: string[]; // IDs of related rules
  conflicts_with: string[]; // IDs of conflicting rules
  
  // Versioning
  version: number;
  created_at: string; // ISO timestamp
  updated_at: string;
  last_verified: string; // When source was last checked
  
  // Search Optimization
  search_keywords: string[]; // For full-text search
  search_vector?: string; // Generated search vector
}

export interface ComplianceStep {
  step_number: number;
  step_description: string;
  deadline: string; // "Before hiring employees", "Within 30 days"
  deadline_type: 'absolute' | 'relative' | 'recurring';
  
  // Required Actions
  required_forms: FormReference[];
  required_documents: string[];
  online_process_url?: string;
  
  // Cost & Time
  estimated_cost: number;
  estimated_time: string; // "2 hours", "1 week"
  
  // Dependencies
  depends_on_steps: number[]; // Other step numbers
  can_be_done_parallel: boolean;
  
  priority: 'critical' | 'high' | 'medium' | 'low';
  
  // Verification
  verification_method: string; // "Receipt required", "Certificate issued"
  completion_proof: string[]; // What documents prove completion
}

export interface FormReference {
  form_name: string; // "Form SS-4"
  form_url: string; // Direct link to form
  form_type: 'pdf' | 'online' | 'paper';
  filing_method: 'online' | 'mail' | 'in_person';
  processing_time: string; // "2-3 weeks"
}

export interface ComplianceSource {
  source_id: string; // Unique identifier for this source
  source_type: 'api' | 'website' | 'pdf' | 'manual' | 'ai_generated';
  source_name: string; // "Regulations.gov", "IRS.gov", "California SOS"
  source_url: string; // Direct link to rule
  
  // API Source Details
  api_endpoint?: string;
  external_id?: string; // ID in source system
  
  // Document Details
  document_title?: string;
  document_section?: string; // "Section 3.2.1"
  page_number?: number;
  
  // Reliability
  reliability_score: number; // 1-10 (10 = official government source)
  last_updated: string;
  verification_status: 'verified' | 'pending' | 'outdated';
  
  // Content Hash (for change detection)
  content_hash: string;
}

// Business Profile Types
export interface BusinessProfile {
  session_id: string;
  user_email?: string;
  
  // Basic Business Info
  business_name: string;
  business_type: 'LLC' | 'Corp' | 'S-Corp' | 'Partnership' | 'Sole Proprietorship' | 'Non-Profit';
  formation_state?: string;
  
  // Size & Scale
  employee_count: number;
  annual_revenue: number;
  revenue_currency: string;
  
  // Industry Classification
  primary_industry: string; // Primary NAICS code
  secondary_industries: string[];
  industry_description: string;
  
  // Location & Operations
  headquarters_state: string;
  headquarters_city: string;
  headquarters_county?: string;
  
  operating_locations: BusinessLocation[];
  
  // Business Activities
  business_activities: string[];
  
  // Special Characteristics
  has_physical_location: boolean;
  has_employees: boolean;
  handles_personal_data: boolean;
  processes_payments: boolean;
  sells_online: boolean;
  interstate_commerce: boolean;
  international_operations: boolean;
  
  // Compliance History
  existing_registrations: string[];
  known_compliance_issues: string[];
  
  // Metadata
  created_at: string;
  updated_at: string;
  last_analysis: string;
}

export interface BusinessLocation {
  address: string;
  city: string;
  state: string;
  county?: string;
  zip_code: string;
  location_type: 'headquarters' | 'branch' | 'warehouse' | 'retail';
  employee_count?: number;
}
