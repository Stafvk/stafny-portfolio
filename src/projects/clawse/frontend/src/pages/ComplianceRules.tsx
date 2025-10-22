import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  FileText, 
  Search, 
  Filter, 
  Loader2, 
  AlertCircle,
  RefreshCw,
  Download
} from 'lucide-react';
import { ComplianceRuleCard } from '../components/ComplianceRule/ComplianceRuleCard';
import type { ComplianceRule, BusinessProfile as BusinessProfileType } from '../types';
// import { complianceRulesApi } from '../services/api';

interface FilterState {
  level: 'all' | 'federal' | 'state' | 'local';
  priority: 'all' | 'critical' | 'high' | 'medium' | 'low';
  searchTerm: string;
}

export const ComplianceRules: React.FC = () => {
  const location = useLocation();
  const [rules, setRules] = useState<ComplianceRule[]>([]);
  const [filteredRules, setFilteredRules] = useState<ComplianceRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    level: 'all',
    priority: 'all',
    searchTerm: '',
  });

  // Get business profile from navigation state if available
  const businessProfile = location.state?.businessProfile as BusinessProfileType | undefined;
  const autoAnalyze = location.state?.autoAnalyze as boolean | undefined;

  // Load rules
  useEffect(() => {
    const loadRules = async () => {
      setIsLoading(true);
      setError(null);

      try {
        let loadedRules: ComplianceRule[];

        // Mock data for demo
        loadedRules = [
          {
            id: '1',
            canonical_id: 'DEMO_001',
            title: 'Business Registration Requirements',
            description: 'All businesses must register with the state within 30 days of formation.',
            authority: 'State Department of Commerce',
            level: 'state' as const,
            jurisdiction: 'California',
            priority: 'high' as const,
            status: 'active' as const,
            applicability_criteria: {
              business_types: ['LLC', 'Corporation'],
              employee_count_range: { min: 0, max: 1000 },
              revenue_range: { min: 0, max: 10000000 },
              states: ['CA'],
              naics_codes: [],
              industry_keywords: [],
              special_conditions: []
            },
            compliance_steps: [
              {
                step_number: 1,
                step_description: 'File Articles of Incorporation',
                deadline: '30 days from formation',
                deadline_type: 'relative' as const,
                required_forms: [],
                required_documents: ['Articles of Incorporation'],
                estimated_cost: 100,
                estimated_time: '1-2 hours',
                depends_on_steps: [],
                can_be_done_parallel: true,
                priority: 'high' as const,
                verification_method: 'State filing confirmation',
                completion_proof: ['Filing receipt']
              }
            ],
            estimated_cost: 100,
            estimated_time: '1-2 hours',
            penalties: {
              monetary_penalty: 500,
              other_penalties: ['Business closure'],
              enforcement_agency: 'State Department of Commerce'
            },
            deadlines: {
              initial_deadline: '30 days from formation',
              grace_period: 15
            },
            sources: [],
            tags: ['registration', 'formation'],
            related_rules: [],
            conflicts_with: [],
            version: 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            last_verified: new Date().toISOString(),
            search_keywords: ['business', 'registration']
          }
        ];

        console.log('Mock rules loaded:', loadedRules.length);

        setRules(loadedRules);
        setFilteredRules(loadedRules);
      } catch (err: any) {
        console.error('Error loading rules:', err);
        setError(err.message || 'Failed to load compliance rules');
      } finally {
        setIsLoading(false);
      }
    };

    loadRules();
  }, [businessProfile, autoAnalyze]);

  // Apply filters
  useEffect(() => {
    let filtered = [...rules];

    // Filter by level
    if (filters.level !== 'all') {
      filtered = filtered.filter(rule => rule.level === filters.level);
    }

    // Filter by priority
    if (filters.priority !== 'all') {
      filtered = filtered.filter(rule => rule.priority === filters.priority);
    }

    // Filter by search term
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(rule =>
        rule.title.toLowerCase().includes(searchLower) ||
        rule.description.toLowerCase().includes(searchLower) ||
        rule.authority.toLowerCase().includes(searchLower) ||
        rule.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    setFilteredRules(filtered);
  }, [rules, filters]);

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleExport = () => {
    // Create CSV content
    const csvContent = [
      ['Title', 'Level', 'Priority', 'Authority', 'Estimated Cost', 'Description'].join(','),
      ...filteredRules.map(rule => [
        `"${rule.title}"`,
        rule.level,
        rule.priority,
        `"${rule.authority}"`,
        rule.estimated_cost,
        `"${rule.description.replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compliance-rules-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading compliance rules...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Rules</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={handleRefresh}
          className="btn btn-primary"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <FileText className="w-8 h-8 mr-3 text-primary-600" />
            Compliance Rules
          </h1>
          <p className="mt-2 text-gray-600">
            {businessProfile && autoAnalyze
              ? `Showing ${filteredRules.length} rules matching your business profile`
              : `Browse and search through ${filteredRules.length} compliance requirements`
            }
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleExport}
            className="btn btn-secondary"
            disabled={filteredRules.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </button>
          <button
            onClick={handleRefresh}
            className="btn btn-secondary"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Business Profile Context */}
      {businessProfile && (
        <div className="card bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-blue-900">
                Analyzing for: {businessProfile.business_name}
              </h3>
              <p className="text-sm text-blue-700 mt-1">
                {businessProfile.business_type} • {businessProfile.headquarters_state} • 
                {businessProfile.employee_count} employees • {businessProfile.primary_industry}
              </p>
            </div>
            {autoAnalyze && (
              <div className="text-sm text-blue-600 font-medium">
                Personalized Results
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search rules..."
              value={filters.searchTerm}
              onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
              className="pl-10 form-input"
            />
          </div>

          {/* Filter Controls */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filters:</span>
            </div>

            <select
              value={filters.level}
              onChange={(e) => handleFilterChange('level', e.target.value)}
              className="form-input py-1 text-sm"
            >
              <option value="all">All Levels</option>
              <option value="federal">Federal</option>
              <option value="state">State</option>
              <option value="local">Local</option>
            </select>

            <select
              value={filters.priority}
              onChange={(e) => handleFilterChange('priority', e.target.value)}
              className="form-input py-1 text-sm"
            >
              <option value="all">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Rules List */}
      {filteredRules.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Rules Found</h3>
          <p className="text-gray-600">
            {filters.searchTerm || filters.level !== 'all' || filters.priority !== 'all'
              ? 'Try adjusting your search criteria or filters.'
              : 'No compliance rules are currently available.'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredRules.map((rule) => (
            <ComplianceRuleCard
              key={rule.id}
              rule={rule}
            />
          ))}
        </div>
      )}
    </div>
  );
};
