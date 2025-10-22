import React, { useState } from 'react';
import { 
  Zap, 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  DollarSign,
  FileText,
  Sparkles
} from 'lucide-react';
import { ComplianceRuleCard } from '../components/ComplianceRule/ComplianceRuleCard';
import type { ComplianceRule, RuleGenerationResponse } from '../types';
// import { aiRuleGenerationApi } from '../services/api';

interface GenerationRequest {
  type: 'federal' | 'state' | 'industry';
  count: number;
  state?: string;
  industry?: string;
  naicsCode?: string;
}

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

const INDUSTRIES = [
  'Technology',
  'Healthcare',
  'Finance',
  'Retail',
  'Manufacturing',
  'Construction',
  'Real Estate',
  'Professional Services',
  'Food & Beverage',
  'Transportation',
  'Education',
  'Entertainment',
  'Agriculture',
  'Energy',
];

export const AIGeneration: React.FC = () => {
  const [request, setRequest] = useState<GenerationRequest>({
    type: 'federal',
    count: 10,
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<RuleGenerationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generatedRules, setGeneratedRules] = useState<ComplianceRule[]>([]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      // Mock AI generation
      console.log('Generating rules:', request);

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      const mockResponse: RuleGenerationResponse = {
        rules: [
          {
            id: 'ai_generated_1',
            canonical_id: 'AI_GEN_001',
            title: `${request.type === 'federal' ? 'Federal' : request.type === 'state' ? 'State' : 'Industry'} Compliance Rule`,
            description: `AI-generated compliance rule for ${request.type} requirements.`,
            authority: request.type === 'federal' ? 'Federal Agency' : request.type === 'state' ? `${request.state} State Government` : 'Industry Regulator',
            level: request.type as any,
            jurisdiction: request.type === 'state' ? request.state || 'Unknown' : 'National',
            priority: 'medium' as const,
            status: 'active' as const,
            applicability_criteria: {
              business_types: ['LLC', 'Corporation'],
              employee_count_range: { min: 0, max: 500 },
              revenue_range: { min: 0, max: 5000000 },
              states: request.type === 'state' ? [request.state || 'CA'] : ['All'],
              naics_codes: request.naicsCode ? [request.naicsCode] : [],
              industry_keywords: request.industry ? [request.industry] : [],
              special_conditions: []
            },
            compliance_steps: [],
            estimated_cost: 250,
            estimated_time: '2-4 hours',
            penalties: {
              monetary_penalty: 1000,
              other_penalties: ['Warning letter'],
              enforcement_agency: 'Regulatory Authority'
            },
            deadlines: {
              initial_deadline: '90 days from effective date'
            },
            sources: [],
            tags: ['ai-generated'],
            related_rules: [],
            conflicts_with: [],
            version: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            last_verified: new Date().toISOString(),
            search_keywords: ['ai', 'generated']
          }
        ],
        generation_time: 2.5,
        total_cost: 0.05
      };

      setResult(mockResponse);
      setGeneratedRules(mockResponse.rules);
    } catch (err: any) {
      console.error('Error generating rules:', err);
      setError(err.message || 'Failed to generate rules');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRequestChange = (field: keyof GenerationRequest, value: any) => {
    setRequest(prev => ({ ...prev, [field]: value }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    return `${(seconds / 60).toFixed(1)}m`;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Zap className="w-8 h-8 mr-3 text-primary-600" />
          AI Rule Generation
        </h1>
        <p className="mt-2 text-gray-600">
          Use AI to generate comprehensive compliance rules tailored to your needs. 
          Our system creates detailed, actionable compliance requirements with steps, deadlines, and penalties.
        </p>
      </div>

      {/* Generation Form */}
      <div className="card">
        <div className="flex items-center space-x-2 mb-6">
          <Sparkles className="w-5 h-5 text-primary-600" />
          <h3 className="text-lg font-semibold text-gray-900">Generate New Rules</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Generation Type */}
          <div>
            <label className="form-label">Rule Type *</label>
            <select
              value={request.type}
              onChange={(e) => handleRequestChange('type', e.target.value)}
              className="form-input"
            >
              <option value="federal">Federal Rules</option>
              <option value="state">State Rules</option>
              <option value="industry">Industry-Specific Rules</option>
            </select>
          </div>

          {/* Count */}
          <div>
            <label className="form-label">Number of Rules *</label>
            <input
              type="number"
              min="1"
              max="50"
              value={request.count}
              onChange={(e) => handleRequestChange('count', parseInt(e.target.value) || 1)}
              className="form-input"
            />
          </div>

          {/* State (conditional) */}
          {request.type === 'state' && (
            <div>
              <label className="form-label">State *</label>
              <select
                value={request.state || ''}
                onChange={(e) => handleRequestChange('state', e.target.value)}
                className="form-input"
              >
                <option value="">Select a state</option>
                {US_STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Industry (conditional) */}
          {request.type === 'industry' && (
            <>
              <div>
                <label className="form-label">Industry *</label>
                <select
                  value={request.industry || ''}
                  onChange={(e) => handleRequestChange('industry', e.target.value)}
                  className="form-input"
                >
                  <option value="">Select an industry</option>
                  {INDUSTRIES.map((industry) => (
                    <option key={industry} value={industry}>
                      {industry}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">NAICS Code</label>
                <input
                  type="text"
                  value={request.naicsCode || ''}
                  onChange={(e) => handleRequestChange('naicsCode', e.target.value)}
                  className="form-input"
                  placeholder="e.g., 541511"
                />
              </div>
            </>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleGenerate}
            disabled={isGenerating || (request.type === 'state' && !request.state) || (request.type === 'industry' && !request.industry)}
            className="btn btn-primary px-8 py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating Rules...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Generate Rules
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Generation Result */}
      {result && (
        <div className="card bg-green-50 border-green-200">
          <div className="flex items-center space-x-2 mb-4">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold text-green-900">
              Generation Complete!
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-800">
                <strong>{result.rules.length}</strong> rules generated
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-800">
                Generated in <strong>{formatTime(result.generation_time)}</strong>
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <DollarSign className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-800">
                API cost: <strong>{formatCurrency(result.total_cost)}</strong>
              </span>
            </div>
          </div>

          <p className="text-sm text-green-700">
            The generated rules have been created and are ready for review. 
            You can expand each rule to see detailed compliance steps, deadlines, and penalties.
          </p>
        </div>
      )}

      {/* Generated Rules */}
      {generatedRules.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Generated Rules ({generatedRules.length})
            </h2>
            <div className="text-sm text-gray-500">
              Total estimated cost: {formatCurrency(
                generatedRules.reduce((sum, rule) => sum + rule.estimated_cost, 0)
              )}
            </div>
          </div>

          {generatedRules.map((rule) => (
            <ComplianceRuleCard
              key={rule.id}
              rule={rule}
            />
          ))}
        </div>
      )}

      {/* Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-medium text-blue-900">
              How AI Rule Generation Works
            </h3>
            <div className="mt-2 text-sm text-blue-700 space-y-2">
              <p>
                • <strong>Federal Rules:</strong> Generates comprehensive federal compliance requirements across multiple agencies and departments
              </p>
              <p>
                • <strong>State Rules:</strong> Creates state-specific regulations including business registration, tax, and licensing requirements
              </p>
              <p>
                • <strong>Industry Rules:</strong> Develops industry-specific compliance requirements based on NAICS codes and sector regulations
              </p>
              <p className="mt-4 text-xs">
                <strong>Note:</strong> AI-generated rules should be reviewed by legal professionals before implementation. 
                Rules are marked with a reliability score and verification status.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
