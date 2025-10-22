// Business Profile Types
export interface BusinessProfile {
  session_id: string;
  business_name: string;
  business_type: 'LLC' | 'Corporation' | 'Partnership' | 'Sole Proprietorship' | 'Non-profit';
  headquarters_state: string;
  employee_count: number;
  annual_revenue: number;
  primary_industry: string;
  naics_code?: string;
  formation_date?: string;
  has_employees?: boolean;
  has_international_operations?: boolean;
  handles_personal_data?: boolean;
  industry_specific_licenses?: string[];
  created_at?: string;
  updated_at?: string;
}

// Compliance Rule Types
export interface ComplianceRule {
  id: string;
  canonical_id: string;
  title: string;
  description: string;
  
  // Authority & Classification
  authority: string;
  level: 'federal' | 'state' | 'local';
  jurisdiction: string;
  
  // Priority & Status
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'active' | 'proposed' | 'deprecated' | 'superseded';
  superseded_by?: string;
  
  // Applicability
  applicability_criteria: ApplicabilityCriteria;
  
  // Implementation
  compliance_steps: ComplianceStep[];
  estimated_cost: number;
  estimated_time: string;
  
  // Penalties
  penalties: {
    monetary_penalty?: number;
    other_penalties: string[];
    enforcement_agency: string;
  };
  
  // Timing
  deadlines: {
    initial_deadline: string;
    recurring_deadline?: string;
    grace_period?: number;
  };
  
  // Source Information
  sources: ComplianceSource[];
  
  // Metadata
  tags: string[];
  related_rules: string[];
  conflicts_with: string[];
  
  // Versioning
  version: number;
  created_at: string;
  updated_at: string;
  last_verified: string;
  
  // Search Optimization
  search_keywords: string[];
  search_vector?: string;
}

export interface ApplicabilityCriteria {
  business_types: string[];
  employee_count_range: {
    min: number;
    max: number;
  };
  revenue_range: {
    min: number;
    max: number;
  };
  states: string[];
  naics_codes: string[];
  industry_keywords: string[];
  special_conditions: string[];
}

export interface ComplianceStep {
  step_number: number;
  step_description: string;
  deadline: string;
  deadline_type: 'absolute' | 'relative' | 'recurring';
  
  // Required Actions
  required_forms: FormReference[];
  required_documents: string[];
  online_process_url?: string;
  
  // Cost & Time
  estimated_cost: number;
  estimated_time: string;
  
  // Dependencies
  depends_on_steps: number[];
  can_be_done_parallel: boolean;
  
  priority: 'critical' | 'high' | 'medium' | 'low';
  
  // Verification
  verification_method: string;
  completion_proof: string[];
}

export interface FormReference {
  form_name: string;
  form_number?: string;
  agency: string;
  download_url?: string;
  online_filing_url?: string;
  filing_fee?: number;
}

export interface ComplianceSource {
  source_id: string;
  source_type: 'api' | 'website' | 'pdf' | 'manual' | 'ai_generated';
  source_name: string;
  source_url: string;
  
  // API Source Details
  api_endpoint?: string;
  external_id?: string;
  
  // Document Details
  document_title?: string;
  document_section?: string;
  page_number?: number;
  
  // Reliability
  reliability_score: number;
  last_updated: string;
  verification_status: 'verified' | 'pending' | 'outdated';
  
  // Content Hash (for change detection)
  content_hash: string;
}

// UI State Types
export interface ComplianceAnalysisResult {
  business_profile: BusinessProfile;
  matching_rules: ComplianceRule[];
  total_estimated_cost: number;
  total_estimated_time: string;
  priority_breakdown: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  compliance_timeline: TimelineItem[];
}

export interface TimelineItem {
  id: string;
  rule_id: string;
  title: string;
  deadline: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  estimated_cost: number;
  steps: ComplianceStep[];
}

// Form Types
export interface BusinessProfileFormData {
  business_name: string;
  business_type: BusinessProfile['business_type'];
  headquarters_state: string;
  employee_count: number;
  annual_revenue: number;
  primary_industry: string;
  naics_code?: string;
  formation_date?: string;
  has_employees?: boolean;
  has_international_operations?: boolean;
  handles_personal_data?: boolean;
  industry_specific_licenses?: string[];
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface RuleGenerationRequest {
  rule_type: 'federal' | 'state' | 'industry';
  count: number;
  state?: string;
  industry?: string;
  naics_code?: string;
}

export interface RuleGenerationResponse {
  rules: ComplianceRule[];
  generation_time: number;
  total_cost: number;
}
