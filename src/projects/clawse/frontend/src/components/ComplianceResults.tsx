import React from 'react';

interface ComplianceRule {
  id: string;
  title: string;
  description: string;
  authority: string;
  level: string;
  priority: string;
  deadline?: string;
  estimated_cost?: {
    filing_fees?: number;
    penalty_range?: {
      min: number;
      max: number;
    };
  };
  compliance_steps?: Array<{
    step_number: number;
    step_description: string;
    deadline?: string;
    estimated_time?: string;
    required_forms?: Array<{
      form_name: string;
      form_url?: string;
    }>;
  }>;
  sources?: Array<{
    source_url?: string;
    source_name?: string;
  }>;
  jurisdiction?: string;
}

interface ComplianceResultsProps {
  complianceResults: ComplianceRule[];
  aiReport: string;
  businessData: {
    businessName: string;
    businessType: string;
    industry: string;
    state: string;
    employees: string;
    revenue: string;
    businessDescription: string;
  };
  onBack: () => void;
}

export const ComplianceResults: React.FC<ComplianceResultsProps> = ({
  complianceResults,
  aiReport,
  businessData,
  onBack
}) => {
  // const [selectedRule, setSelectedRule] = useState<ComplianceRule | null>(null);

  // Sort rules by priority
  const sortedRules = [...complianceResults].sort((a, b) => {
    const priorityOrder = { 'critical': 0, 'high': 1, 'medium': 2, 'low': 3 };
    const aPriority = priorityOrder[a.priority?.toLowerCase() as keyof typeof priorityOrder] ?? 4;
    const bPriority = priorityOrder[b.priority?.toLowerCase() as keyof typeof priorityOrder] ?? 4;
    return aPriority - bPriority;
  });

  const getPriorityColor = (priority: string = 'low') => {
    switch (priority?.toLowerCase()) {
      case 'critical': return 'border-danger-500 bg-danger-50';
      case 'high': return 'border-warning-500 bg-warning-50';
      case 'medium': return 'border-primary-500 bg-primary-50';
      default: return 'border-success-500 bg-success-50';
    }
  };

  const getPriorityBadge = (priority: string = 'low') => {
    switch (priority?.toLowerCase()) {
      case 'critical': return 'badge-danger';
      case 'high': return 'badge-warning';
      case 'medium': return 'badge-primary';
      default: return 'badge-success';
    }
  };

  const handleRuleClick = (rule: ComplianceRule) => {
    if (rule.sources && rule.sources.length > 0 && rule.sources[0].source_url) {
      window.open(rule.sources[0].source_url, '_blank');
    }
  };

  const formatAIReport = (report: string) => {
    // Parse and format the AI report with proper HTML structure
    const lines = report.split('\n').filter(line => line.trim() !== '');
    const formattedContent: React.ReactElement[] = [];

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();

      // Handle headers (markdown style)
      if (trimmedLine.startsWith('###')) {
        const headerText = trimmedLine.replace(/^###\s*/, '');
        formattedContent.push(
          <h3 key={index} className="text-xl font-bold text-secondary-900 mt-6 mb-3 border-b-2 border-primary-200 pb-2">
            {headerText}
          </h3>
        );
      } else if (trimmedLine.startsWith('##')) {
        const headerText = trimmedLine.replace(/^##\s*/, '');
        formattedContent.push(
          <h2 key={index} className="text-2xl font-bold text-secondary-900 mt-8 mb-4 text-primary-700">
            {headerText}
          </h2>
        );
      } else if (trimmedLine.startsWith('#')) {
        const headerText = trimmedLine.replace(/^#\s*/, '');
        formattedContent.push(
          <h1 key={index} className="text-3xl font-bold text-secondary-900 mt-8 mb-6 text-gradient">
            {headerText}
          </h1>
        );
      }
      // Handle bullet points
      else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
        const bulletText = trimmedLine.replace(/^[-*]\s*/, '');
        const formattedText = bulletText
          .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-secondary-900">$1</strong>')
          .replace(/\*(.*?)\*/g, '<em class="italic text-secondary-700">$1</em>');

        formattedContent.push(
          <div key={index} className="flex items-start space-x-3 mb-2">
            <div className="w-2 h-2 bg-primary-500 rounded-full mt-2 flex-shrink-0"></div>
            <p className="text-secondary-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: formattedText }} />
          </div>
        );
      }
      // Handle numbered lists
      else if (/^\d+\.\s/.test(trimmedLine)) {
        const listText = trimmedLine.replace(/^\d+\.\s*/, '');
        const formattedText = listText
          .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-secondary-900">$1</strong>')
          .replace(/\*(.*?)\*/g, '<em class="italic text-secondary-700">$1</em>');

        formattedContent.push(
          <div key={index} className="flex items-start space-x-3 mb-2">
            <div className="w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
              {trimmedLine.match(/^(\d+)/)?.[1]}
            </div>
            <p className="text-secondary-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: formattedText }} />
          </div>
        );
      }
      // Handle regular paragraphs
      else if (trimmedLine.length > 0) {
        const formattedText = trimmedLine
          .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-secondary-900">$1</strong>')
          .replace(/\*(.*?)\*/g, '<em class="italic text-secondary-700">$1</em>')
          .replace(/`(.*?)`/g, '<code class="bg-secondary-100 text-secondary-800 px-2 py-1 rounded text-sm">$1</code>');

        formattedContent.push(
          <p key={index} className="text-secondary-700 leading-relaxed mb-4" dangerouslySetInnerHTML={{ __html: formattedText }} />
        );
      }
    });

    return <div className="space-y-2">{formattedContent}</div>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary-50 via-white to-primary-50">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary-600/10 via-accent-500/10 to-primary-700/10"></div>
        <div className="relative bg-white/80 backdrop-blur-md border-b border-white/20 shadow-soft">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={onBack}
                  className="btn btn-secondary"
                >
                  ← Back to Form
                </button>
                <div>
                  <h1 className="text-3xl font-bold text-secondary-900">
                    Compliance Report for {businessData.businessName}
                  </h1>
                  <p className="text-secondary-600 mt-1">
                    {businessData.businessType} • {businessData.industry} • {businessData.state}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary-600">{sortedRules.length}</div>
                <div className="text-sm text-secondary-600">Total Rules</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left Side - AI Report (3 columns) */}
          <div className="lg:col-span-3 space-y-6">
            <div className="card-elevated p-8">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-accent-500 to-primary-600 rounded-xl flex items-center justify-center shadow-glow">
                  <span className="text-2xl">🤖</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-secondary-900">
                    AI Compliance Analysis
                  </h2>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="badge badge-primary">
                      Powered by AI
                    </span>
                    <span className="badge badge-secondary">
                      GPT-5-Nano
                    </span>
                  </div>
                </div>
              </div>

              <div className="max-w-none">
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                  <div className="text-secondary-700 leading-relaxed">
                    {formatAIReport(aiReport)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Rules List (2 columns) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Summary Stats */}
            <div className="card-elevated p-6">
              <h3 className="text-lg font-bold text-secondary-900 mb-4">Compliance Summary</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-gradient-to-br from-danger-50 to-danger-100 rounded-2xl border border-danger-200">
                  <div className="text-3xl font-bold text-danger-600 mb-1">
                    {sortedRules.filter(r => r.priority?.toLowerCase() === 'critical').length}
                  </div>
                  <div className="text-sm font-semibold text-danger-700">Critical</div>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-warning-50 to-warning-100 rounded-2xl border border-warning-200">
                  <div className="text-3xl font-bold text-warning-600 mb-1">
                    {sortedRules.filter(r => r.priority?.toLowerCase() === 'high').length}
                  </div>
                  <div className="text-sm font-semibold text-warning-700">High Priority</div>
                </div>
              </div>
            </div>

            <div className="card-elevated p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center">
                  <span className="text-xl">📋</span>
                </div>
                <h2 className="text-2xl font-bold text-secondary-900">
                  Compliance Requirements ({sortedRules.length})
                </h2>
              </div>

              <div className="space-y-4">
                {sortedRules.map((rule, index) => (
                  <div
                    key={rule.id || index}
                    onClick={() => handleRuleClick(rule)}
                    className={`p-4 rounded-xl border-l-4 ${getPriorityColor(rule.priority)} cursor-pointer hover:shadow-medium transition-all duration-200 transform hover:-translate-y-1`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className={`badge ${getPriorityBadge(rule.priority)} text-xs`}>
                          {rule.priority?.toLowerCase() === 'critical' ? '🚨' : rule.priority?.toLowerCase() === 'high' ? '⚠️' : '📋'} {rule.priority || 'Low'}
                        </span>
                        <span className="badge badge-secondary text-xs">
                          {rule.level || 'Unknown'}
                        </span>
                      </div>
                      {rule.sources && rule.sources.length > 0 && rule.sources[0].source_url && (
                        <span className="text-xs text-primary-600">🔗 Click to view source</span>
                      )}
                    </div>

                    <h4 className="font-bold text-secondary-900 mb-2 line-clamp-2">
                      {rule.title || 'Untitled Rule'}
                    </h4>

                    <p className="text-sm text-secondary-600 mb-3 line-clamp-3">
                      {rule.description || 'No description available'}
                    </p>

                    <div className="flex items-center justify-between text-xs text-secondary-500">
                      <span>{rule.authority || 'Unknown Authority'}</span>
                      {rule.estimated_cost?.filing_fees && (
                        <span className="font-medium">${rule.estimated_cost.filing_fees}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
