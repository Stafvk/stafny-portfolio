import React from 'react';
import { ArrowLeft, Database, Server, Globe, Zap, Shield, Brain, Code, GitBranch } from 'lucide-react';
import { Link } from 'react-router-dom';

const Documentation: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link 
              to="/" 
              className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Application
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Technical Documentation</h1>
            <div className="w-24"></div> {/* Spacer for centering */}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview */}
        <section className="mb-12">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Business Compliance Platform</h2>
            <div className="prose max-w-none">
              <p className="text-lg text-gray-700 mb-4">
                An AI-powered compliance analysis platform that helps US businesses identify and understand 
                the regulations, laws, and requirements that apply to their specific business context.
              </p>
              <div className="grid md:grid-cols-3 gap-6 mt-8">
                <div className="bg-blue-50 p-6 rounded-lg">
                  <Shield className="w-8 h-8 text-blue-600 mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-2">Comprehensive Coverage</h3>
                  <p className="text-gray-600">Analyzes thousands of regulations from hundreds of federal, state, and local agencies.</p>
                </div>
                <div className="bg-green-50 p-6 rounded-lg">
                  <Brain className="w-8 h-8 text-green-600 mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-2">AI-Powered Analysis</h3>
                  <p className="text-gray-600">Uses GPT-5-nano to intelligently filter and prioritize relevant compliance requirements.</p>
                </div>
                <div className="bg-purple-50 p-6 rounded-lg">
                  <Zap className="w-8 h-8 text-purple-600 mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-2">Real-Time Processing</h3>
                  <p className="text-gray-600">Searches government APIs in real-time and processes results without timeout limitations.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Architecture Overview */}
        <section className="mb-12">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <Code className="w-6 h-6 mr-3 text-blue-600" />
              System Architecture
            </h2>
            
            <div className="mb-8">
              <div className="bg-gray-100 p-6 rounded-lg font-mono text-sm">
                <div className="text-center mb-4 font-bold">┌─── User Browser ───┐</div>
                <div className="text-center mb-2">│</div>
                <div className="text-center mb-4">▼</div>
                <div className="text-center mb-4 bg-blue-100 p-2 rounded">Frontend (React + TypeScript)</div>
                <div className="text-center mb-4">│ Netlify CDN │</div>
                <div className="text-center mb-2">│</div>
                <div className="text-center mb-4">▼ HTTPS API Calls</div>
                <div className="text-center mb-4 bg-green-100 p-2 rounded">Backend API (Node.js + Express)</div>
                <div className="text-center mb-4">│ Railway Cloud │</div>
                <div className="text-center mb-2">│</div>
                <div className="text-center mb-4">▼</div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-yellow-100 p-2 rounded">Firebase<br/>Database</div>
                  <div className="bg-red-100 p-2 rounded">Government<br/>APIs</div>
                  <div className="bg-purple-100 p-2 rounded">OpenAI<br/>GPT-5-nano</div>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                  <Globe className="w-5 h-5 mr-2 text-blue-600" />
                  Frontend Layer
                </h3>
                <ul className="space-y-2 text-gray-700">
                  <li><strong>Framework:</strong> React 18 with TypeScript</li>
                  <li><strong>Styling:</strong> Tailwind CSS for responsive design</li>
                  <li><strong>State Management:</strong> React hooks and context</li>
                  <li><strong>Routing:</strong> React Router for navigation</li>
                  <li><strong>HTTP Client:</strong> Axios with 120s timeout</li>
                  <li><strong>Deployment:</strong> Netlify CDN (global distribution)</li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                  <Server className="w-5 h-5 mr-2 text-green-600" />
                  Backend Layer
                </h3>
                <ul className="space-y-2 text-gray-700">
                  <li><strong>Runtime:</strong> Node.js with Express.js</li>
                  <li><strong>Language:</strong> JavaScript (ES6+)</li>
                  <li><strong>Database:</strong> Firebase Firestore (NoSQL)</li>
                  <li><strong>AI Integration:</strong> OpenAI GPT-5-nano API</li>
                  <li><strong>External APIs:</strong> Regulations.gov, SBA, IRS</li>
                  <li><strong>Deployment:</strong> Railway Pro (no timeout limits)</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Data Structures */}
        <section className="mb-12">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <Database className="w-6 h-6 mr-3 text-green-600" />
              Data Structures & Models
            </h2>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Business Profile Schema */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-blue-600">Business Profile Schema</h3>
                <div className="bg-gray-50 p-4 rounded-lg font-mono text-sm">
                  <pre>{`{
  "id": "string",
  "businessName": "string",
  "businessType": "LLC | Corporation | Partnership | Sole Proprietorship",
  "businessCategory": "Technology | Restaurant | Retail | Healthcare | Construction | ...",
  "businessState": "CA | NY | TX | FL | ...",
  "businessCity": "string",
  "employeeCount": "1-5 | 6-15 | 16-50 | 51-200 | 200+",
  "annualRevenue": "$0-$100K | $100K-$1M | $1M-$5M | $5M+",
  "businessDescription": "string",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}`}</pre>
                </div>
              </div>

              {/* Compliance Rule Schema */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-green-600">Compliance Rule Schema</h3>
                <div className="bg-gray-50 p-4 rounded-lg font-mono text-sm">
                  <pre>{`{
  "id": "string",
  "title": "string",
  "description": "string",
  "authority": "IRS | SBA | FTC | State Agency | ...",
  "priority": "critical | high | medium | low",
  "category": "Tax | Employment | Licensing | Safety | ...",
  "applicableStates": ["CA", "NY", "TX", ...],
  "applicableIndustries": ["Technology", "Restaurant", ...],
  "businessSizeRequirements": {
    "minEmployees": number,
    "maxEmployees": number,
    "minRevenue": number
  },
  "actionRequired": "string",
  "url": "string",
  "lastUpdated": "timestamp",
  "relevanceScore": number
}`}</pre>
                </div>
              </div>
            </div>

            {/* Database Collections */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4 text-purple-600">Firebase Collections Structure</h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid md:grid-cols-3 gap-6">
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">📁 business-profiles</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• User business data</li>
                      <li>• Indexed by state & industry</li>
                      <li>• Auto-generated IDs</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">📁 compliance-rules</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Cached regulation data</li>
                      <li>• Indexed by category & state</li>
                      <li>• AI-processed metadata</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-2">📁 search-cache</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Query result caching</li>
                      <li>• TTL: 24 hours</li>
                      <li>• Performance optimization</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Technical Implementation */}
        <section className="mb-12">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <GitBranch className="w-6 h-6 mr-3 text-purple-600" />
              Technical Implementation Details
            </h2>

            <div className="space-y-8">
              {/* Real-Time Search Engine */}
              <div>
                <h3 className="text-xl font-semibold mb-4 text-blue-600">Real-Time Compliance Search Engine</h3>
                <div className="bg-blue-50 p-6 rounded-lg">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-3">Search Process Flow:</h4>
                      <ol className="list-decimal list-inside space-y-2 text-sm">
                        <li>Business profile analysis & keyword extraction</li>
                        <li>Parallel API searches (Regulations.gov, SBA, IRS)</li>
                        <li>Result deduplication & normalization</li>
                        <li>AI-powered relevance scoring (GPT-5-nano)</li>
                        <li>Priority-based filtering & ranking</li>
                        <li>Response caching for performance</li>
                      </ol>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-3">Performance Optimizations:</h4>
                      <ul className="list-disc list-inside space-y-2 text-sm">
                        <li>Batch processing (10 rules per AI call)</li>
                        <li>Concurrent API requests with 8s timeout</li>
                        <li>Database indexing on state + industry</li>
                        <li>24-hour result caching</li>
                        <li>Background rule storage</li>
                        <li>Progressive loading indicators</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI Integration */}
              <div>
                <h3 className="text-xl font-semibold mb-4 text-green-600">AI-Powered Rule Analysis</h3>
                <div className="bg-green-50 p-6 rounded-lg">
                  <div className="mb-4">
                    <h4 className="font-semibold mb-2">GPT-5-nano Integration:</h4>
                    <p className="text-sm text-gray-700 mb-4">
                      The system uses OpenAI's GPT-5-nano model to analyze and filter compliance rules based on business context.
                    </p>
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-3">AI Processing Pipeline:</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>Business context extraction from profile</li>
                        <li>Rule relevance scoring (0.0 - 1.0)</li>
                        <li>Industry-specific filtering</li>
                        <li>Geographic applicability analysis</li>
                        <li>Priority level assignment</li>
                        <li>Action requirement generation</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-3">Quality Assurance:</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>Strict relevance threshold (&gt;0.9)</li>
                        <li>Multi-layer filtering system</li>
                        <li>Penalty keywords for irrelevant rules</li>
                        <li>Business-type specific validation</li>
                        <li>State-specific requirement matching</li>
                        <li>Fallback to basic processing</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Deployment & Scalability */}
        <section className="mb-12">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Deployment & Scalability</h2>

            <div className="grid lg:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold mb-4 text-blue-600">Production Infrastructure</h3>
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-800 mb-2">Frontend (Netlify)</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Global CDN distribution</li>
                      <li>• Automatic HTTPS & SSL</li>
                      <li>• Branch-based deployments</li>
                      <li>• Build optimization & caching</li>
                    </ul>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-green-800 mb-2">Backend (Railway Pro)</h4>
                    <ul className="text-sm space-y-1">
                      <li>• No timeout limitations</li>
                      <li>• Auto-scaling capabilities</li>
                      <li>• Environment variable management</li>
                      <li>• Continuous deployment from Git</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-4 text-green-600">Scalability Features</h3>
                <div className="space-y-4">
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-yellow-800 mb-2">Performance</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Concurrent API processing</li>
                      <li>• Intelligent caching strategy</li>
                      <li>• Database query optimization</li>
                      <li>• Background rule processing</li>
                    </ul>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-purple-800 mb-2">Reliability</h4>
                    <ul className="text-sm space-y-1">
                      <li>• Graceful error handling</li>
                      <li>• API timeout management</li>
                      <li>• Fallback processing modes</li>
                      <li>• Health monitoring endpoints</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Project Insights */}
        <section className="mb-12">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Project Insights & Challenges</h2>

            <div className="space-y-6">
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">Problem Statement</h3>
                <p className="text-gray-700 mb-4">
                  Small businesses face overwhelming complexity in understanding which regulations apply to them.
                  With thousands of rules from hundreds of agencies, varying by location, industry, and business size,
                  compliance becomes a significant barrier to business success.
                </p>
                <p className="text-gray-700">
                  This platform solves that problem by providing intelligent, AI-powered analysis that filters
                  the regulatory landscape down to only the rules that matter for each specific business.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-red-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4 text-red-800">Technical Challenges Solved</h3>
                  <ul className="space-y-2 text-sm">
                    <li><strong>Timeout Limitations:</strong> Moved from Netlify Functions (10s limit) to Railway (unlimited)</li>
                    <li><strong>Rule Relevance:</strong> Implemented multi-layer AI filtering to eliminate irrelevant results</li>
                    <li><strong>API Rate Limits:</strong> Built concurrent processing with intelligent batching</li>
                    <li><strong>Data Volume:</strong> Designed efficient caching and deduplication systems</li>
                    <li><strong>User Experience:</strong> Created single-page workflow with real-time progress</li>
                  </ul>
                </div>

                <div className="bg-green-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4 text-green-800">Key Innovations</h3>
                  <ul className="space-y-2 text-sm">
                    <li><strong>Hybrid Search:</strong> Combines cached data with real-time API searches</li>
                    <li><strong>Context-Aware AI:</strong> Uses complete business profile for accurate filtering</li>
                    <li><strong>Progressive Enhancement:</strong> Works without JavaScript, enhanced with it</li>
                    <li><strong>Intelligent Caching:</strong> Balances freshness with performance</li>
                    <li><strong>Scalable Architecture:</strong> Designed to handle thousands of concurrent users</li>
                  </ul>
                </div>
              </div>

              <div className="bg-blue-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-4 text-blue-800">Development Approach</h3>
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <h4 className="font-semibold mb-2">Comprehensiveness</h4>
                    <p>Integrated multiple government APIs, built intelligent rule categorization, and designed for extensibility to new regulation sources.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Functionality</h4>
                    <p>Focused on reliability with graceful error handling, fallback mechanisms, and comprehensive testing across business types.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Design</h4>
                    <p>Single-page application with intuitive workflow, clean visual hierarchy, and responsive design for all devices.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <section className="text-center py-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <p className="text-gray-600 mb-4">
              Built with modern web technologies and AI to solve real business problems.
            </p>
            <div className="flex justify-center space-x-6 text-sm text-gray-500">
              <span>React + TypeScript</span>
              <span>•</span>
              <span>Node.js + Express</span>
              <span>•</span>
              <span>Firebase</span>
              <span>•</span>
              <span>OpenAI GPT-5-nano</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Documentation;
