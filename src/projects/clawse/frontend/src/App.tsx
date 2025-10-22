import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { ComplianceResults } from './components/ComplianceResults';
import Documentation from './pages/Documentation';
import { getApiUrl, debugConfig } from './config/environment';

// Error Boundary Component
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error?: Error}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 React Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-red-50 flex items-center justify-center p-8">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
            <h2 className="text-xl font-bold text-red-600 mb-4">⚠️ Something went wrong</h2>
            <p className="text-gray-600 mb-4">
              The application encountered an error. Please refresh the page and try again.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Refresh Page
            </button>
            <details className="mt-4">
              <summary className="text-sm text-gray-500 cursor-pointer">Error Details</summary>
              <pre className="text-xs text-gray-400 mt-2 overflow-auto">
                {this.state.error?.toString()}
              </pre>
            </details>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Single-Screen Business Compliance Checker
const ComplianceChecker = () => {
  // Debug environment configuration in development
  React.useEffect(() => {
    if (import.meta.env.DEV) {
      debugConfig();
    }
  }, []);

  const [businessData, setBusinessData] = React.useState({
    businessName: '',
    businessType: '',
    industry: '',
    state: '',
    employees: '',
    revenue: '',
    businessDescription: ''
  });

  const [complianceResults, setComplianceResults] = React.useState<any[]>([]);
  const [aiReport, setAiReport] = React.useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [hasAnalyzed, setHasAnalyzed] = React.useState(false);
  const [showResults, setShowResults] = React.useState(false);

  // Progress tracking for the main analysis
  const [analysisProgress, setAnalysisProgress] = React.useState<any>(null);

  const handleInputChange = (field: string, value: any) => {
    setBusinessData(prev => ({ ...prev, [field]: value }));
  };

  const handleBackToForm = () => {
    setShowResults(false);
    setHasAnalyzed(false);
    setIsAnalyzing(false);
    setAnalysisProgress(null);
  };



  const analyzeCompliance = async () => {
    setIsAnalyzing(true);
    setAnalysisProgress({ step: 'starting', percentage: 5, message: 'Starting compliance analysis...' });

    try {
      // Create business profile with session ID
      const profileWithSession = {
        businessName: businessData.businessName,
        businessType: businessData.businessType,
        industry: businessData.industry,
        state: businessData.state,
        employees: businessData.employees,
        revenue: businessData.revenue,
        description: businessData.businessDescription,
        session_id: `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('🚀 Starting enhanced compliance analysis with real-time search...');
      setAnalysisProgress({ step: 'enhanced_search', percentage: 15, message: 'Searching government databases in real-time...' });

      // Start progressive loading simulation
      const progressInterval = setInterval(() => {
        setAnalysisProgress((prev: any) => {
          if (!prev || prev.percentage >= 95) return prev;
          const newPercentage = Math.min(prev.percentage + Math.random() * 5 + 2, 95);
          let newMessage = prev.message;
          let newStep = prev.step;

          if (newPercentage >= 25 && prev.step === 'enhanced_search') {
            newStep = 'searching_apis';
            newMessage = 'Searching Regulations.gov and SBA databases...';
          } else if (newPercentage >= 45 && prev.step === 'searching_apis') {
            newStep = 'collecting_data';
            newMessage = 'Collecting and processing compliance data...';
          } else if (newPercentage >= 65 && prev.step === 'collecting_data') {
            newStep = 'processing';
            newMessage = 'Processing rules and generating AI report...';
          } else if (newPercentage >= 85 && prev.step === 'processing') {
            newStep = 'finalizing';
            newMessage = 'Finalizing compliance analysis...';
          }

          return { step: newStep, percentage: Math.round(newPercentage), message: newMessage };
        });
      }, 1500);

      // Use enhanced analysis with real-time search
      const response = await fetch(getApiUrl('/compliance/analyze-enhanced'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileWithSession),
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        throw new Error(`Enhanced analysis failed with status: ${response.status}`);
      }

      setAnalysisProgress({ step: 'processing', percentage: 95, message: 'Processing compliance rules and generating report...' });

      const result = await response.json();
      console.log('📊 Enhanced API Response received:', result);

      if (result.success) {
        console.log('✅ Setting compliance results:', result.data.matching_rules?.length || 0, 'rules');
        console.log('🤖 Setting AI report length:', result.data.ai_report?.length || 0, 'characters');

        setComplianceResults(result.data.matching_rules || []);
        setAiReport(result.data.ai_report || '');
        setHasAnalyzed(true);
        setAnalysisProgress({ step: 'complete', percentage: 100, message: 'Compliance analysis completed successfully!' });

        // Navigate to results page after a short delay
        setTimeout(() => {
          setShowResults(true);
        }, 2000);

        // Log enhanced search metadata if available
        if (result.data.metadata?.search_enhanced) {
          console.log('🔍 Enhanced real-time search was used for this analysis');
          console.log('📊 Search stats:', result.data.metadata);
        }
      } else {
        throw new Error(result.error || 'Analysis failed');
      }

    } catch (error) {
      console.error('Error analyzing compliance:', error);

      // Show error message to user
      alert(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);

      // Fallback to mock data if API fails
      const mockResults = [
        {
          id: 1,
          title: "Business Registration",
          description: `Register your ${businessData.businessType} with ${businessData.state} Secretary of State`,
          priority: "Critical",
          level: "State",
          authority: `${businessData.state} Secretary of State`,
          deadline: "Within 30 days of formation",
          cost: "$100-300",
          steps: [
            "File Articles of Incorporation/Organization",
            "Obtain Certificate of Good Standing",
            "Register for state taxes"
          ],
          applicable: true,
          reason: `Required for all ${businessData.businessType} entities in ${businessData.state}`
        },
        {
          id: 2,
          title: "Federal Tax ID (EIN)",
          description: "Obtain an Employer Identification Number from the IRS",
          priority: "Critical",
          level: "Federal",
          authority: "Internal Revenue Service",
          deadline: "Before hiring employees or opening bank accounts",
          cost: "Free (if applied directly with IRS)",
          steps: [
            "Apply online at IRS.gov",
            "Provide business information",
            "Receive EIN immediately"
          ],
          applicable: true,
          reason: "Required for all business entities"
        }
      ];

      // Add employee-specific rules
      if (businessData.employees && businessData.employees !== '0') {
        mockResults.push({
          id: 3,
          title: "Workers' Compensation Insurance",
          description: "Obtain workers' compensation insurance for employees",
          priority: "High",
          level: "State",
          authority: `${businessData.state} Department of Labor`,
          deadline: "Before first employee starts work",
          cost: "$500-2000 annually",
          steps: [
            "Contact licensed insurance carrier",
            "Determine coverage amounts",
            "File certificate with state"
          ],
          applicable: true,
          reason: `Required for businesses with employees in ${businessData.state}`
        });
      }

      // Add data privacy rules based on business description
      if (businessData.businessDescription.toLowerCase().includes('data') ||
          businessData.businessDescription.toLowerCase().includes('customer') ||
          businessData.businessDescription.toLowerCase().includes('personal')) {
        mockResults.push({
          id: 4,
          title: "Data Privacy Compliance",
          description: "Implement privacy policies and data protection measures",
          priority: "High",
          level: businessData.state === 'CA' ? 'State' : 'Federal',
          authority: businessData.state === 'CA' ? 'California Attorney General' : 'FTC',
          deadline: "Before collecting personal data",
          cost: "$1000-5000 for implementation",
          steps: [
            "Create privacy policy",
            "Implement data security measures",
            "Train employees on data handling"
          ],
          applicable: true,
          reason: "Required for businesses handling personal information"
        });
      }

      // Add industry-specific rules
      if (businessData.industry === 'Healthcare') {
        mockResults.push({
          id: 5,
          title: "HIPAA Compliance",
          description: "Implement HIPAA privacy and security requirements",
          priority: "Critical",
          level: "Federal",
          authority: "Department of Health and Human Services",
          deadline: "Before handling protected health information",
          cost: "$2000-10000 for implementation",
          steps: [
            "Conduct risk assessment",
            "Implement administrative safeguards",
            "Train workforce on HIPAA requirements"
          ],
          applicable: true,
          reason: "Required for healthcare-related businesses"
        });
      }

      setComplianceResults(mockResults);
      setHasAnalyzed(true);
    } finally {
      setIsAnalyzing(false);
    }
  };



  const getPriorityColor = (priority: string = 'low') => {
    switch (priority?.toLowerCase()) {
      case 'critical': return 'border-red-500 bg-red-50';
      case 'high': return 'border-orange-500 bg-orange-50';
      case 'medium': return 'border-yellow-500 bg-yellow-50';
      default: return 'border-green-500 bg-green-50';
    }
  };

  const getPriorityBadge = (priority: string = 'low') => {
    switch (priority?.toLowerCase()) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-green-100 text-green-800';
    }
  };

  // Show results page if analysis is complete and results should be shown
  if (showResults && hasAnalyzed && complianceResults.length > 0) {
    return (
      <ComplianceResults
        complianceResults={complianceResults}
        aiReport={aiReport}
        businessData={businessData}
        onBack={handleBackToForm}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary-50 via-white to-primary-50">
      {/* Navigation Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-600 rounded-xl flex items-center justify-center">
                <span className="text-xl">🏢</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900">Business Compliance Platform</h1>
            </div>
            <Link
              to="/documentation"
              className="flex items-center space-x-2 px-4 py-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <span>📚</span>
              <span>Technical Documentation</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Modern Header with Glassmorphism */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary-600/10 via-accent-500/10 to-primary-700/10"></div>
        <div className="relative bg-white/80 backdrop-blur-md border-b border-white/20 shadow-soft">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center animate-fade-in">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-primary-500 to-accent-600 rounded-2xl shadow-glow mb-6 animate-bounce-subtle">
                <span className="text-3xl">🏢</span>
              </div>
              <h1 className="text-hero text-gradient mb-4">
                Business Compliance Checker
              </h1>
              <p className="text-subtitle max-w-2xl mx-auto">
                Get personalized compliance rules by searching government databases in real-time with AI-powered insights
              </p>
              <div className="flex items-center justify-center space-x-2 mt-4">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse-soft"></div>
                  <span className="text-sm text-secondary-600">Real-time API</span>
                </div>
                <div className="w-1 h-1 bg-secondary-300 rounded-full"></div>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse-soft"></div>
                  <span className="text-sm text-secondary-600">AI-Powered</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Left Side - Business Information Form */}
          <div className="space-y-8 animate-slide-up">
            <div className="card-elevated p-8">
              <div className="flex items-center space-x-3 mb-8">
                <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-glow">
                  <span className="text-xl">🏢</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-secondary-900">
                    Business Information
                  </h2>
                  <p className="text-secondary-600">Tell us about your business to get personalized compliance rules</p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Business Name */}
                <div className="group">
                  <label className="form-label">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    value={businessData.businessName}
                    onChange={(e) => handleInputChange('businessName', e.target.value)}
                    className="form-input"
                    placeholder="e.g., Acme Innovations Inc."
                  />
                </div>

                {/* Business Type */}
                <div className="group">
                  <label className="form-label">
                    Business Type *
                  </label>
                  <select
                    value={businessData.businessType}
                    onChange={(e) => handleInputChange('businessType', e.target.value)}
                    className="form-select"
                  >
                    <option value="">Select business type</option>
                    <option value="LLC">LLC (Limited Liability Company)</option>
                    <option value="Corporation">Corporation (C-Corp)</option>
                    <option value="S-Corporation">S-Corporation</option>
                    <option value="Partnership">Partnership</option>
                    <option value="Sole Proprietorship">Sole Proprietorship</option>
                    <option value="Non-Profit">Non-Profit Organization</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Industry */}
                <div className="group">
                  <label className="form-label">
                    Industry *
                  </label>
                  <select
                    value={businessData.industry}
                    onChange={(e) => handleInputChange('industry', e.target.value)}
                    className="form-select"
                  >
                    <option value="">Select an industry</option>
                    <option value="Technology">Technology</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Finance">Finance</option>
                    <option value="Retail">Retail</option>
                    <option value="Manufacturing">Manufacturing</option>
                    <option value="Construction">Construction</option>
                    <option value="Real Estate">Real Estate</option>
                    <option value="Food & Beverage">Food & Beverage</option>
                    <option value="Professional Services">Professional Services</option>
                    <option value="Education">Education</option>
                    <option value="Transportation">Transportation</option>
                    <option value="Agriculture">Agriculture</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Location (State) */}
                <div className="group">
                  <label className="form-label">
                    Location (State) *
                  </label>
                  <select
                    value={businessData.state}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    className="form-select"
                  >
                    <option value="">Select a state</option>
                    <option value="CA">California</option>
                    <option value="NY">New York</option>
                    <option value="TX">Texas</option>
                    <option value="FL">Florida</option>
                    <option value="IL">Illinois</option>
                    <option value="WA">Washington</option>
                    <option value="MA">Massachusetts</option>
                    <option value="NJ">New Jersey</option>
                    <option value="VA">Virginia</option>
                    <option value="CO">Colorado</option>
                    <option value="AZ">Arizona</option>
                    <option value="PA">Pennsylvania</option>
                    <option value="OH">Ohio</option>
                    <option value="GA">Georgia</option>
                    <option value="NC">North Carolina</option>
                    <option value="MI">Michigan</option>
                  </select>
                </div>

                {/* Number of Employees */}
                <div className="group">
                  <label className="form-label">
                    Number of Employees *
                  </label>
                  <select
                    value={businessData.employees}
                    onChange={(e) => handleInputChange('employees', e.target.value)}
                    className="form-select"
                  >
                    <option value="">Select a range</option>
                    <option value="0">Just me (0 employees)</option>
                    <option value="1-5">1-5 employees</option>
                    <option value="6-15">6-15 employees</option>
                    <option value="16-50">16-50 employees</option>
                    <option value="51-100">51-100 employees</option>
                    <option value="100+">100+ employees</option>
                  </select>
                </div>

                {/* Annual Revenue */}
                <div className="group">
                  <label className="form-label">
                    Annual Revenue *
                  </label>
                  <select
                    value={businessData.revenue}
                    onChange={(e) => handleInputChange('revenue', e.target.value)}
                    className="form-select"
                  >
                    <option value="">Select a range</option>
                    <option value="0-50k">$0 - $50,000</option>
                    <option value="50k-250k">$50,000 - $250,000</option>
                    <option value="250k-1m">$250,000 - $1,000,000</option>
                    <option value="1m-5m">$1,000,000 - $5,000,000</option>
                    <option value="5m+">$5,000,000+</option>
                  </select>
                </div>

                {/* Business Description */}
                <div className="group">
                  <label className="form-label">
                    Business Description *
                  </label>
                  <textarea
                    value={businessData.businessDescription}
                    onChange={(e) => handleInputChange('businessDescription', e.target.value)}
                    rows={4}
                    className="form-input resize-none"
                    placeholder="Describe your primary business activities, products, or services. Be specific to get the most accurate results.

Examples:
• We operate a full-service restaurant serving Italian cuisine with 15 employees and alcohol service
• We're a software development company creating mobile apps for healthcare clients
• We manufacture custom furniture for residential customers with a 5,000 sq ft facility"
                  />
                  <p className="mt-2 text-sm text-secondary-500">
                    The more specific you are, the more accurate your compliance requirements will be.
                  </p>
                </div>

                <div className="pt-8">
                  <button
                    onClick={analyzeCompliance}
                    disabled={!businessData.businessName || !businessData.businessType || !businessData.state || !businessData.industry || !businessData.employees || !businessData.revenue || !businessData.businessDescription || isAnalyzing}
                    className={`btn w-full py-4 text-lg ${
                      (!businessData.businessName || !businessData.businessType || !businessData.state || !businessData.industry || !businessData.employees || !businessData.revenue || !businessData.businessDescription || isAnalyzing)
                        ? 'bg-secondary-400 text-white cursor-not-allowed transform-none hover:scale-100'
                        : 'btn-primary'
                    }`}
                  >
                    {isAnalyzing ? (
                      <>
                        <div className="loading-spinner w-5 h-5 inline-block mr-3"></div>
                        Getting Compliance Rules...
                      </>
                    ) : (
                      <>
                        <span className="mr-2">🚀</span>
                        Get Compliance Rules
                      </>
                    )}
                  </button>
                  <p className="mt-4 text-sm text-secondary-500 text-center">
                    We'll search government databases in real-time and generate your personalized compliance report
                  </p>
                </div>
              </div>
            </div>


          </div>



          {/* Right Side - Compliance Results */}
          <div className="space-y-8 animate-slide-up" style={{animationDelay: '0.2s'}}>
            {!hasAnalyzed && !isAnalyzing && (
              <div className="card-elevated p-12 text-center">
                <div className="w-24 h-24 bg-gradient-to-br from-primary-100 to-accent-100 rounded-3xl flex items-center justify-center mx-auto mb-6 animate-bounce-subtle">
                  <span className="text-4xl">📋</span>
                </div>
                <h3 className="text-2xl font-bold text-secondary-900 mb-4">
                  Ready to Check Compliance?
                </h3>
                <p className="text-secondary-600 text-lg leading-relaxed">
                  Fill out your business information on the left and click "Get Compliance Rules" to see what rules apply to your business.
                </p>
                <div className="mt-8 flex items-center justify-center space-x-6 text-sm text-secondary-500">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-success-500 rounded-full"></div>
                    <span>Real-time Search</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                    <span>AI-Powered</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-accent-500 rounded-full"></div>
                    <span>Personalized</span>
                  </div>
                </div>
              </div>
            )}

            {isAnalyzing && (
              <div className="card-elevated p-10 text-center animate-scale-in">
                <div className="w-20 h-20 bg-gradient-to-br from-primary-500 to-accent-600 rounded-2xl flex items-center justify-center mx-auto mb-6 animate-pulse-soft">
                  <span className="text-3xl">🔍</span>
                </div>
                <h3 className="text-2xl font-bold text-secondary-900 mb-3">
                  Getting Your Compliance Rules...
                </h3>
                <p className="text-secondary-600 text-lg mb-8">
                  Searching government databases in real-time and generating your personalized report.
                </p>

                {/* Real-time Progress Indicator */}
                {analysisProgress && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-primary-900">
                        {analysisProgress.message}
                      </span>
                      <span className="text-sm font-bold text-primary-600 bg-primary-50 px-3 py-1 rounded-full">
                        {analysisProgress.percentage}%
                      </span>
                    </div>

                    <div className="w-full bg-secondary-200 rounded-full h-4 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-primary-500 to-accent-500 h-4 rounded-full transition-all duration-700 ease-out shadow-glow"
                        style={{ width: `${analysisProgress.percentage}%` }}
                      ></div>
                    </div>

                    {/* Step Indicators */}
                    <div className="grid grid-cols-2 gap-6 mt-8">
                      <div className="flex items-center space-x-3 p-3 rounded-xl bg-white/50 backdrop-blur-sm">
                        <div className={`w-4 h-4 rounded-full transition-all duration-300 ${
                          analysisProgress.step === 'starting' || analysisProgress.percentage >= 5
                            ? 'bg-success-500 shadow-glow' : 'bg-secondary-300'
                        }`}></div>
                        <span className={`text-sm font-medium ${analysisProgress.step === 'starting' ? 'text-primary-600' : 'text-secondary-600'}`}>
                          📊 Initializing
                        </span>
                      </div>

                      <div className="flex items-center space-x-3 p-3 rounded-xl bg-white/50 backdrop-blur-sm">
                        <div className={`w-4 h-4 rounded-full transition-all duration-300 ${
                          analysisProgress.step === 'enhanced_search' || analysisProgress.step === 'searching_apis' || analysisProgress.percentage >= 15
                            ? 'bg-success-500 animate-pulse-soft shadow-glow' : 'bg-secondary-300'
                        }`}></div>
                        <span className={`text-sm font-medium ${(analysisProgress.step === 'enhanced_search' || analysisProgress.step === 'searching_apis') ? 'text-primary-600' : 'text-secondary-600'}`}>
                          📡 Government APIs
                        </span>
                      </div>

                      <div className="flex items-center space-x-3 p-3 rounded-xl bg-white/50 backdrop-blur-sm">
                        <div className={`w-4 h-4 rounded-full transition-all duration-300 ${
                          analysisProgress.step === 'collecting_data' || analysisProgress.percentage >= 45
                            ? 'bg-success-500 shadow-glow' : analysisProgress.step === 'searching_apis' ? 'bg-warning-500 animate-pulse-soft' : 'bg-secondary-300'
                        }`}></div>
                        <span className={`text-sm font-medium ${analysisProgress.step === 'collecting_data' || analysisProgress.percentage >= 45 ? 'text-success-600' : 'text-secondary-600'}`}>
                          📊 Data Collection
                        </span>
                      </div>

                      <div className="flex items-center space-x-3 p-3 rounded-xl bg-white/50 backdrop-blur-sm">
                        <div className={`w-4 h-4 rounded-full transition-all duration-300 ${
                          analysisProgress.step === 'processing' || analysisProgress.percentage >= 65
                            ? 'bg-success-500 shadow-glow' : analysisProgress.step === 'collecting_data' ? 'bg-warning-500 animate-pulse-soft' : 'bg-secondary-300'
                        }`}></div>
                        <span className={`text-sm font-medium ${analysisProgress.step === 'processing' || analysisProgress.percentage >= 65 ? 'text-success-600' : 'text-secondary-600'}`}>
                          🤖 AI Processing
                        </span>
                      </div>

                      <div className="flex items-center space-x-3 p-3 rounded-xl bg-white/50 backdrop-blur-sm">
                        <div className={`w-4 h-4 rounded-full transition-all duration-300 ${
                          analysisProgress.step === 'finalizing' || analysisProgress.percentage >= 85
                            ? 'bg-success-500 animate-pulse-soft shadow-glow' : 'bg-secondary-300'
                        }`}></div>
                        <span className={`text-sm font-medium ${analysisProgress.step === 'finalizing' || analysisProgress.percentage >= 85 ? 'text-primary-600' : 'text-secondary-600'}`}>
                          📋 Report Generation
                        </span>
                      </div>

                    </div>

                    <div className="mt-6 p-4 bg-white/30 backdrop-blur-sm rounded-xl">
                      <p className="text-sm text-secondary-600 text-center">
                        {analysisProgress.step === 'enhanced_search' && '🔍 Initializing real-time search...'}
                        {analysisProgress.step === 'searching_apis' && '📡 Searching government databases...'}
                        {analysisProgress.step === 'collecting_data' && '📊 Collecting compliance data...'}
                        {analysisProgress.step === 'processing' && '🤖 Analyzing rules with AI...'}
                        {analysisProgress.step === 'finalizing' && '📋 Generating your compliance report...'}
                        {analysisProgress.step === 'complete' && '✅ Analysis complete! Your compliance report is ready.'}
                        {!analysisProgress.step && '⏱️ This may take 30-60 seconds depending on your business complexity...'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {hasAnalyzed && Array.isArray(complianceResults) && complianceResults.length > 0 && (
              <div className="space-y-8 animate-fade-in">
                <div className="alert alert-success">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-success-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm">✓</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-success-900">
                        Analysis Complete!
                      </h3>
                      <p className="text-success-700 mt-1">
                        Found {complianceResults.length} compliance requirements for your business.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="card-elevated p-8">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-600 rounded-xl flex items-center justify-center">
                      <span className="text-xl">📊</span>
                    </div>
                    <h3 className="text-2xl font-bold text-secondary-900">
                      Compliance Summary
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="text-center p-6 bg-gradient-to-br from-danger-50 to-danger-100 rounded-2xl border border-danger-200">
                      <div className="text-4xl font-bold text-danger-600 mb-2">
                        {complianceResults.filter(r => r.priority?.toLowerCase() === 'critical').length}
                      </div>
                      <div className="text-sm font-semibold text-danger-700">Critical</div>
                    </div>
                    <div className="text-center p-6 bg-gradient-to-br from-warning-50 to-warning-100 rounded-2xl border border-warning-200">
                      <div className="text-4xl font-bold text-warning-600 mb-2">
                        {complianceResults.filter(r => r.priority?.toLowerCase() === 'high').length}
                      </div>
                      <div className="text-sm font-semibold text-warning-700">High Priority</div>
                    </div>
                  </div>
                </div>

                {/* AI-Generated Compliance Report */}
                {aiReport && (
                  <div className="card-elevated p-8 bg-gradient-to-br from-accent-50 via-white to-primary-50">
                    <div className="flex items-center space-x-3 mb-6">
                      <div className="w-12 h-12 bg-gradient-to-br from-accent-500 to-primary-600 rounded-xl flex items-center justify-center shadow-glow">
                        <span className="text-2xl">🤖</span>
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-secondary-900">
                          AI-Generated Compliance Report
                        </h3>
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
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                      <div className="text-secondary-700 leading-relaxed">
                        {typeof aiReport === 'string' ? (
                          <div className="whitespace-pre-wrap">{aiReport}</div>
                        ) : (
                          <pre className="text-sm overflow-auto">{JSON.stringify(aiReport, null, 2)}</pre>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {complianceResults.map((rule, index) => (
                  <div key={rule.id || index} className={`card-elevated p-8 border-l-4 ${getPriorityColor(rule.priority)} animate-slide-up`} style={{animationDelay: `${index * 0.1}s`}}>
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center space-x-3">
                        <span className={`badge ${getPriorityBadge(rule.priority)} text-sm`}>
                          {rule.priority?.toLowerCase() === 'critical' ? '🚨' : rule.priority?.toLowerCase() === 'high' ? '⚠️' : '📋'} {rule.priority || 'Low'}
                        </span>
                        <span className="badge badge-primary text-sm">
                          {rule.level || 'Unknown'}
                        </span>
                      </div>
                    </div>

                    <h4 className="text-2xl font-bold text-secondary-900 mb-4">
                      {rule.title || 'Untitled Rule'}
                    </h4>

                    <p className="text-secondary-600 text-lg mb-6 leading-relaxed">
                      {rule.description || 'No description available'}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm mb-8">
                      <div className="flex items-center space-x-3 p-3 bg-secondary-50 rounded-xl">
                        <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                          <span className="text-primary-600 text-sm">🏛️</span>
                        </div>
                        <div>
                          <div className="font-semibold text-secondary-900">Authority</div>
                          <div className="text-secondary-600">{rule.authority || 'Unknown'}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 p-3 bg-secondary-50 rounded-xl">
                        <div className="w-8 h-8 bg-warning-100 rounded-lg flex items-center justify-center">
                          <span className="text-warning-600 text-sm">⏰</span>
                        </div>
                        <div>
                          <div className="font-semibold text-secondary-900">Deadline</div>
                          <div className="text-secondary-600">{rule.deadline || 'Not specified'}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 p-3 bg-secondary-50 rounded-xl">
                        <div className="w-8 h-8 bg-success-100 rounded-lg flex items-center justify-center">
                          <span className="text-success-600 text-sm">💰</span>
                        </div>
                        <div>
                          <div className="font-semibold text-secondary-900">Estimated Cost</div>
                          <div className="text-secondary-600">${rule.estimated_cost?.filing_fees || 0}</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 p-3 bg-secondary-50 rounded-xl">
                        <div className="w-8 h-8 bg-accent-100 rounded-lg flex items-center justify-center">
                          <span className="text-accent-600 text-sm">📍</span>
                        </div>
                        <div>
                          <div className="font-semibold text-secondary-900">Jurisdiction</div>
                          <div className="text-secondary-600">{rule.jurisdiction || 'US'}</div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-secondary-50 to-white rounded-2xl p-6 border border-secondary-100">
                      <div className="flex items-center space-x-3 mb-6">
                        <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                          <span className="text-primary-600 text-sm">📋</span>
                        </div>
                        <h5 className="text-lg font-bold text-secondary-900">Compliance Steps</h5>
                      </div>
                      <div className="space-y-4">
                        {(rule.compliance_steps || []).map((step: any, stepIndex: number) => (
                          <div key={stepIndex} className="bg-white rounded-xl p-4 border border-secondary-100 hover:shadow-soft transition-all duration-200">
                            <div className="flex items-start space-x-4">
                              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-soft">
                                {step.step_number || stepIndex + 1}
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold text-secondary-900 mb-2">{step.step_description}</p>
                                <div className="flex flex-wrap gap-3 text-xs">
                                  {step.deadline && (
                                    <div className="flex items-center space-x-1 bg-warning-50 text-warning-700 px-2 py-1 rounded-full">
                                      <span>⏰</span>
                                      <span><strong>Deadline:</strong> {step.deadline}</span>
                                    </div>
                                  )}
                                  {step.estimated_time && (
                                    <div className="flex items-center space-x-1 bg-primary-50 text-primary-700 px-2 py-1 rounded-full">
                                      <span>⏱️</span>
                                      <span><strong>Time:</strong> {step.estimated_time}</span>
                                    </div>
                                  )}
                                </div>
                                {step.required_forms && step.required_forms.length > 0 && (
                                  <div className="mt-3">
                                    <p className="text-xs font-semibold text-secondary-700 mb-2">Required Forms:</p>
                                    <div className="flex flex-wrap gap-2">
                                      {step.required_forms.map((form: any, formIndex: number) => (
                                        <a
                                          key={formIndex}
                                          href={form.form_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center space-x-1 bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-xs font-medium hover:bg-primary-200 transition-colors duration-200"
                                        >
                                          <span>📄</span>
                                          <span>{form.form_name}</span>
                                        </a>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      {(!rule.compliance_steps || rule.compliance_steps.length === 0) && (
                        <div className="text-center py-8">
                          <div className="w-16 h-16 bg-secondary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-2xl">📞</span>
                          </div>
                          <p className="text-secondary-600 italic">Contact {rule.authority} for specific compliance requirements.</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>


    </div>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route path="/" element={<ComplianceChecker />} />
          <Route path="/documentation" element={<Documentation />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
