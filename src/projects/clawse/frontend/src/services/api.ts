import axios from 'axios';
import { config } from '../config/environment';
import type {
  BusinessProfile,
  ComplianceRule,
  ComplianceAnalysisResult,
  RuleGenerationRequest,
  RuleGenerationResponse,
  ApiResponse
} from '../types';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: config.API_BASE_URL,
  timeout: 120000, // Increased timeout for Railway (no function limits)
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth tokens if needed
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

// Business Profile API
export const businessProfileApi = {
  create: async (profile: Omit<BusinessProfile, 'session_id' | 'created_at' | 'updated_at'>): Promise<BusinessProfile> => {
    const response = await api.post<ApiResponse<BusinessProfile>>('/business-profiles', profile);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to create business profile');
    }
    return response.data.data;
  },

  get: async (sessionId: string): Promise<BusinessProfile | null> => {
    try {
      const response = await api.get<ApiResponse<BusinessProfile>>(`/business-profiles/${sessionId}`);
      return response.data.data || null;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  update: async (sessionId: string, profile: Partial<BusinessProfile>): Promise<BusinessProfile> => {
    const response = await api.put<ApiResponse<BusinessProfile>>(`/business-profiles/${sessionId}`, profile);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to update business profile');
    }
    return response.data.data;
  },

  delete: async (sessionId: string): Promise<void> => {
    const response = await api.delete<ApiResponse<void>>(`/business-profiles/${sessionId}`);
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to delete business profile');
    }
  },
};

// Compliance Rules API
export const complianceRulesApi = {
  getAll: async (limit: number = 50): Promise<ComplianceRule[]> => {
    const response = await api.get<ApiResponse<ComplianceRule[]>>(`/compliance-rules?limit=${limit}`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to fetch compliance rules');
    }
    return response.data.data;
  },

  getById: async (id: string): Promise<ComplianceRule> => {
    const response = await api.get<ApiResponse<ComplianceRule>>(`/compliance-rules/${id}`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to fetch compliance rule');
    }
    return response.data.data;
  },

  search: async (businessType: string, state: string, limit: number = 20): Promise<ComplianceRule[]> => {
    const response = await api.get<ApiResponse<ComplianceRule[]>>(
      `/compliance-rules/search?business_type=${businessType}&state=${state}&limit=${limit}`
    );
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to search compliance rules');
    }
    return response.data.data;
  },

  getMatching: async (profile: BusinessProfile): Promise<ComplianceRule[]> => {
    const response = await api.post<ApiResponse<ComplianceRule[]>>('/compliance-rules/match', profile);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to get matching rules');
    }
    return response.data.data;
  },
};

// AI Rule Generation API
export const aiRuleGenerationApi = {
  generateFederalRules: async (count: number = 10): Promise<RuleGenerationResponse> => {
    const response = await api.post<ApiResponse<RuleGenerationResponse>>('/ai/generate-federal-rules', { count });
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to generate federal rules');
    }
    return response.data.data;
  },

  generateStateRules: async (state: string, count: number = 5): Promise<RuleGenerationResponse> => {
    const response = await api.post<ApiResponse<RuleGenerationResponse>>('/ai/generate-state-rules', { state, count });
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to generate state rules');
    }
    return response.data.data;
  },

  generateIndustryRules: async (industry: string, naicsCode: string, count: number = 5): Promise<RuleGenerationResponse> => {
    const response = await api.post<ApiResponse<RuleGenerationResponse>>('/ai/generate-industry-rules', { 
      industry, 
      naics_code: naicsCode, 
      count 
    });
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to generate industry rules');
    }
    return response.data.data;
  },

  generateCustomRules: async (request: RuleGenerationRequest): Promise<RuleGenerationResponse> => {
    const response = await api.post<ApiResponse<RuleGenerationResponse>>('/ai/generate-rules', request);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to generate custom rules');
    }
    return response.data.data;
  },
};

// Compliance Analysis API
export const complianceAnalysisApi = {
  analyze: async (profile: BusinessProfile): Promise<ComplianceAnalysisResult> => {
    const response = await api.post<ApiResponse<ComplianceAnalysisResult>>('/compliance/analyze', profile);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to analyze compliance');
    }
    return response.data.data;
  },

  analyzeEnhanced: async (profile: BusinessProfile): Promise<ComplianceAnalysisResult> => {
    const response = await api.post<ApiResponse<ComplianceAnalysisResult>>('/compliance/analyze-enhanced', profile);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to analyze compliance with enhanced search');
    }
    return response.data.data;
  },

  realTimeSearch: async (query: string, businessCategory?: string, businessProfile?: BusinessProfile): Promise<{
    query: string;
    results: ComplianceRule[];
    metadata: {
      source: string;
      responseTime: string;
      cached: boolean;
      stats?: any;
    };
  }> => {
    const response = await api.post<ApiResponse<any>>('/compliance/realtime-search', {
      query,
      businessCategory,
      businessProfile
    });
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to perform real-time search');
    }
    return response.data.data;
  },

  getCacheStats: async (): Promise<{
    enabled: boolean;
    totalCached?: number;
    popularTerms?: Array<[string, number]>;
    cacheHitRate?: number;
  }> => {
    const response = await api.get<ApiResponse<any>>('/compliance/cache-stats');
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to get cache statistics');
    }
    return response.data.data;
  },

  getTimeline: async (profileId: string): Promise<ComplianceAnalysisResult['compliance_timeline']> => {
    const response = await api.get<ApiResponse<ComplianceAnalysisResult['compliance_timeline']>>(
      `/compliance/timeline/${profileId}`
    );
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || 'Failed to get compliance timeline');
    }
    return response.data.data;
  },
};

// Health Check API
export const healthApi = {
  check: async (): Promise<{ status: string; timestamp: string }> => {
    const response = await api.get<ApiResponse<{ status: string; timestamp: string }>>('/health');
    if (!response.data.success || !response.data.data) {
      throw new Error('Health check failed');
    }
    return response.data.data;
  },
};

export default api;
