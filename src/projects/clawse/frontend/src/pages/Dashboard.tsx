import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Building2, 
  FileText, 
  Zap, 
  AlertTriangle, 
  Clock, 
  DollarSign,
  TrendingUp,
  CheckCircle,
  ArrowRight
} from 'lucide-react';

const stats = [
  {
    name: 'Total Rules',
    value: '2,847',
    change: '+12%',
    changeType: 'increase' as const,
    icon: FileText,
  },
  {
    name: 'Critical Rules',
    value: '23',
    change: '-2%',
    changeType: 'decrease' as const,
    icon: AlertTriangle,
  },
  {
    name: 'Avg. Compliance Cost',
    value: '$4,250',
    change: '+5%',
    changeType: 'increase' as const,
    icon: DollarSign,
  },
  {
    name: 'Completion Rate',
    value: '87%',
    change: '+8%',
    changeType: 'increase' as const,
    icon: CheckCircle,
  },
];

const quickActions = [
  {
    title: 'Create Business Profile',
    description: 'Set up your business information to get personalized compliance recommendations',
    icon: Building2,
    href: '/profile',
    color: 'bg-blue-500',
  },
  {
    title: 'Browse Compliance Rules',
    description: 'Explore federal, state, and local compliance requirements',
    icon: FileText,
    href: '/rules',
    color: 'bg-green-500',
  },
  {
    title: 'Generate AI Rules',
    description: 'Use AI to generate custom compliance rules for your industry',
    icon: Zap,
    href: '/generate',
    color: 'bg-purple-500',
  },
];

const recentActivity = [
  {
    id: 1,
    type: 'rule_generated',
    title: 'New federal rules generated',
    description: '15 new compliance rules added for technology sector',
    time: '2 hours ago',
    icon: Zap,
    color: 'text-purple-600',
  },
  {
    id: 2,
    type: 'profile_updated',
    title: 'Business profile updated',
    description: 'Employee count and revenue information updated',
    time: '1 day ago',
    icon: Building2,
    color: 'text-blue-600',
  },
  {
    id: 3,
    type: 'compliance_check',
    title: 'Compliance analysis completed',
    description: 'Found 8 applicable rules for your business',
    time: '2 days ago',
    icon: CheckCircle,
    color: 'text-green-600',
  },
];

export const Dashboard: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Welcome to your compliance management dashboard. Get insights and manage your business compliance requirements.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="card">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Icon className="h-8 w-8 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {stat.name}
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900">
                        {stat.value}
                      </div>
                      <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                        stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        <TrendingUp className="h-4 w-4 flex-shrink-0 self-center" />
                        <span className="sr-only">
                          {stat.changeType === 'increase' ? 'Increased' : 'Decreased'} by
                        </span>
                        {stat.change}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.title}
                to={action.href}
                className="card hover:shadow-md transition-shadow duration-200 group"
              >
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-lg ${action.color}`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900 group-hover:text-primary-600">
                      {action.title}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {action.description}
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-primary-600" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Recent Activity</h2>
        <div className="card">
          <div className="flow-root">
            <ul className="-mb-8">
              {recentActivity.map((activity, activityIdx) => {
                const Icon = activity.icon;
                return (
                  <li key={activity.id}>
                    <div className="relative pb-8">
                      {activityIdx !== recentActivity.length - 1 ? (
                        <span
                          className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                          aria-hidden="true"
                        />
                      ) : null}
                      <div className="relative flex space-x-3">
                        <div>
                          <span className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center ring-8 ring-white">
                            <Icon className={`h-4 w-4 ${activity.color}`} />
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {activity.title}
                            </p>
                            <p className="text-sm text-gray-500">
                              {activity.description}
                            </p>
                          </div>
                          <div className="text-right text-sm whitespace-nowrap text-gray-500">
                            <time>{activity.time}</time>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>

      {/* Getting Started */}
      <div className="bg-primary-50 border border-primary-200 rounded-lg p-6">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-primary-600" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-medium text-primary-900">
              Get Started with Compliance Management
            </h3>
            <p className="mt-2 text-sm text-primary-700">
              Start by creating your business profile to receive personalized compliance recommendations. 
              Our AI-powered system will analyze your business and provide relevant federal, state, and local requirements.
            </p>
            <div className="mt-4">
              <Link
                to="/profile"
                className="btn btn-primary"
              >
                Create Business Profile
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
