import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Clock, 
  DollarSign, 
  ExternalLink, 
  ChevronDown, 
  ChevronUp,
  Building,
  MapPin,
  Calendar
} from 'lucide-react';
import { clsx } from 'clsx';
import type { ComplianceRule } from '../../types';

interface ComplianceRuleCardProps {
  rule: ComplianceRule;
  showDetails?: boolean;
  onToggleDetails?: () => void;
}

const priorityConfig = {
  critical: {
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: AlertTriangle,
  },
  high: {
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    icon: AlertTriangle,
  },
  medium: {
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    icon: Clock,
  },
  low: {
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    icon: Clock,
  },
};

const levelConfig = {
  federal: { label: 'Federal', color: 'bg-blue-100 text-blue-800' },
  state: { label: 'State', color: 'bg-green-100 text-green-800' },
  local: { label: 'Local', color: 'bg-purple-100 text-purple-800' },
};

export const ComplianceRuleCard: React.FC<ComplianceRuleCardProps> = ({
  rule,
  showDetails = false,
  onToggleDetails,
}) => {
  const [isExpanded, setIsExpanded] = useState(showDetails);
  const priorityInfo = priorityConfig[rule.priority];
  const levelInfo = levelConfig[rule.level];
  const PriorityIcon = priorityInfo.icon;

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
    onToggleDetails?.();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className={clsx(
      'card border-l-4 transition-all duration-200',
      priorityInfo.borderColor,
      isExpanded ? 'shadow-md' : 'hover:shadow-md'
    )}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <div className={clsx(
              'flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium',
              priorityInfo.bgColor,
              priorityInfo.color
            )}>
              <PriorityIcon className="w-3 h-3" />
              <span className="capitalize">{rule.priority}</span>
            </div>
            
            <span className={clsx(
              'px-2 py-1 rounded-full text-xs font-medium',
              levelInfo.color
            )}>
              {levelInfo.label}
            </span>
          </div>

          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {rule.title}
          </h3>

          <p className="text-gray-600 text-sm mb-3">
            {rule.description.length > 150
              ? `${rule.description.substring(0, 150)}...`
              : rule.description
            }
          </p>

          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <div className="flex items-center space-x-1">
              <Building className="w-4 h-4" />
              <span>{rule.authority}</span>
            </div>
            
            <div className="flex items-center space-x-1">
              <MapPin className="w-4 h-4" />
              <span>{rule.jurisdiction}</span>
            </div>
            
            <div className="flex items-center space-x-1">
              <DollarSign className="w-4 h-4" />
              <span>{formatCurrency(rule.estimated_cost)}</span>
            </div>
            
            <div className="flex items-center space-x-1">
              <Clock className="w-4 h-4" />
              <span>{rule.estimated_time}</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleToggle}
          className="ml-4 p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-50"
        >
          {isExpanded ? (
            <ChevronUp className="w-5 h-5" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          {/* Deadlines */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
              <Calendar className="w-4 h-4 mr-2" />
              Deadlines
            </h4>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-sm font-medium text-gray-700">Initial Deadline:</span>
                  <p className="text-sm text-gray-600">{rule.deadlines.initial_deadline}</p>
                </div>
                {rule.deadlines.recurring_deadline && (
                  <div>
                    <span className="text-sm font-medium text-gray-700">Recurring:</span>
                    <p className="text-sm text-gray-600">{rule.deadlines.recurring_deadline}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Compliance Steps */}
          {rule.compliance_steps.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-900 mb-3">
                Compliance Steps ({rule.compliance_steps.length})
              </h4>
              <div className="space-y-3">
                {rule.compliance_steps.slice(0, 3).map((step, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-xs font-medium">
                      {step.step_number}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">{step.step_description}</p>
                      <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                        <span>Deadline: {step.deadline}</span>
                        <span>Cost: {formatCurrency(step.estimated_cost)}</span>
                        <span>Time: {step.estimated_time}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {rule.compliance_steps.length > 3 && (
                  <p className="text-sm text-gray-500 text-center">
                    +{rule.compliance_steps.length - 3} more steps
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Penalties */}
          {rule.penalties.other_penalties.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Penalties</h4>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                {rule.penalties.monetary_penalty && (
                  <div className="mb-2">
                    <span className="text-sm font-medium text-red-800">Monetary Penalty:</span>
                    <span className="text-sm text-red-700 ml-2">
                      {formatCurrency(rule.penalties.monetary_penalty)}
                    </span>
                  </div>
                )}
                <div>
                  <span className="text-sm font-medium text-red-800">Other Penalties:</span>
                  <ul className="text-sm text-red-700 mt-1 list-disc list-inside">
                    {rule.penalties.other_penalties.map((penalty, index) => (
                      <li key={index}>{penalty}</li>
                    ))}
                  </ul>
                </div>
                <div className="mt-2">
                  <span className="text-sm font-medium text-red-800">Enforcement Agency:</span>
                  <span className="text-sm text-red-700 ml-2">{rule.penalties.enforcement_agency}</span>
                </div>
              </div>
            </div>
          )}

          {/* Sources */}
          {rule.sources.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Sources</h4>
              <div className="space-y-2">
                {rule.sources.map((source, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{source.source_name}</p>
                      <p className="text-xs text-gray-500">
                        Reliability: {source.reliability_score}/10 • 
                        Last updated: {new Date(source.last_updated).toLocaleDateString()}
                      </p>
                    </div>
                    {source.source_url && (
                      <a
                        href={source.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:text-primary-700"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {rule.tags.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Tags</h4>
              <div className="flex flex-wrap gap-2">
                {rule.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
