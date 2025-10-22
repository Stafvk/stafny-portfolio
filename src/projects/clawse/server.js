const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const admin = require('firebase-admin');
const { RealTimeComplianceSearch } = require('./src/services/RealTimeComplianceSearch');

// Load environment variables
dotenv.config();

// Initialize Firebase Admin SDK directly
let firebaseApp;
function initializeFirebase() {
  if (firebaseApp) {
    return firebaseApp;
  }

  try {
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    };

    if (!serviceAccount.projectId || !serviceAccount.privateKey || !serviceAccount.clientEmail) {
      throw new Error('Missing required Firebase environment variables. Please check your .env file.');
    }

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.projectId,
    });

    console.log('✅ Firebase Admin SDK initialized successfully');
    return firebaseApp;

  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin SDK:', error);
    throw error;
  }
}

// Get Firestore instance
function getFirestore() {
  if (!firebaseApp) {
    initializeFirebase();
  }
  return admin.firestore();
}

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Firebase
initializeFirebase();
const db = getFirestore();

// Initialize Real-Time Compliance Search
let realTimeSearch = null;
try {
  // Create a simple Firestore service wrapper for the real-time search
  const simpleFirestoreService = {
    db: db,
    async getMatchingRules(businessProfile) {
      return await getMatchingRules(businessProfile);
    },
    async storeRules(rules) {
      return await storeRulesInFirestore(rules);
    }
  };

  realTimeSearch = new RealTimeComplianceSearch(
    process.env.OPENAI_API_KEY,
    simpleFirestoreService,
    process.env.REGULATIONS_API_KEY
  );
  console.log('✅ Real-Time Compliance Search initialized');

  // Cache pre-warming disabled - only search when user requests
  console.log('💤 Cache pre-warming disabled - searches will happen on-demand only');
} catch (error) {
  console.error('❌ Failed to initialize Real-Time Search:', error);
}

// Simple Firestore service functions
async function getMatchingRules(businessProfile) {
  console.log('🔍 Searching for matching rules...');

  try {
    // Get all active rules (simplified for demo)
    const snapshot = await db
      .collection('compliance_rules')
      .where('status', '==', 'active')
      .limit(50)
      .get();

    const allRules = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`📋 Found ${allRules.length} total rules in database`);

    // Simple filtering based on business profile
    const matchingRules = allRules.filter(rule => {
      if (!rule.applicability_criteria) return true;

      const criteria = rule.applicability_criteria;

      // Check business type
      if (criteria.business_types && criteria.business_types.length > 0) {
        const businessTypeMatch = criteria.business_types.includes(businessProfile.business_type) ||
                                 criteria.business_types.includes('ALL');
        if (!businessTypeMatch) return false;
      }

      // Check state
      if (criteria.states && criteria.states.length > 0) {
        const stateMatch = criteria.states.includes(businessProfile.headquarters_state) ||
                          criteria.states.includes('ALL');
        if (!stateMatch) return false;
      }

      return true;
    });

    console.log(`✅ Found ${matchingRules.length} matching rules`);

    // Debug: Log the structure of the first rule
    if (matchingRules.length > 0) {
      console.log('🔍 Sample rule structure:', JSON.stringify(matchingRules[0], null, 2));
    }

    return matchingRules;

  } catch (error) {
    console.error('❌ Error getting matching rules:', error);
    return [];
  }
}

async function storeBusinessProfile(profile) {
  try {
    const profileRef = db.collection('business_profiles').doc(profile.session_id);
    await profileRef.set({
      ...profile,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      updated_at: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`✅ Stored business profile: ${profile.business_name}`);
  } catch (error) {
    console.error('❌ Error storing business profile:', error);
    throw error;
  }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      realTimeSearchEnabled: !!realTimeSearch
    }
  });
});

// Cache statistics endpoint
app.get('/api/compliance/cache-stats', (req, res) => {
  try {
    if (!realTimeSearch) {
      return res.json({
        success: true,
        data: {
          enabled: false,
          message: 'Real-time search not available'
        }
      });
    }

    const stats = realTimeSearch.getCacheStats();
    res.json({
      success: true,
      data: {
        enabled: true,
        ...stats,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error getting cache stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Business Profile endpoints
app.post('/api/business-profiles', async (req, res) => {
  try {
    const profile = req.body;
    await storeBusinessProfile(profile);
    
    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('Error creating business profile:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/business-profiles/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const doc = await db.collection('business_profiles').doc(sessionId).get();
    const profile = doc.exists ? doc.data() : null;
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        error: 'Business profile not found'
      });
    }
    
    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    console.error('Error getting business profile:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Compliance Rules endpoints
app.get('/api/compliance-rules', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const snapshot = await db.collection('compliance_rules').limit(limit).get();
    const rules = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    res.json({
      success: true,
      data: rules
    });
  } catch (error) {
    console.error('Error getting compliance rules:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/compliance-rules/search', async (req, res) => {
  try {
    const { business_type, state, limit = 20 } = req.query;
    const rules = await firestoreService.searchRules(business_type, state, parseInt(limit));
    
    res.json({
      success: true,
      data: rules
    });
  } catch (error) {
    console.error('Error searching compliance rules:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/compliance-rules/match', async (req, res) => {
  try {
    const businessProfile = req.body;
    const matchingRules = await getMatchingRules(businessProfile);

    res.json({
      success: true,
      data: matchingRules
    });
  } catch (error) {
    console.error('Error matching compliance rules:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Store active search progress
const activeSearches = new Map();

// Real-Time Compliance Search endpoint with progress tracking
app.post('/api/compliance/realtime-search', async (req, res) => {
  try {
    const { query, businessCategory, businessProfile } = req.body;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    if (!realTimeSearch) {
      return res.status(503).json({
        success: false,
        error: 'Real-time search service not available'
      });
    }

    console.log(`🔍 Real-time search request: "${query}"`);

    // Generate search ID for progress tracking
    const searchId = `search_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    // Initialize progress tracking
    activeSearches.set(searchId, {
      query: query.trim(),
      status: 'starting',
      progress: { step: 'initializing', percentage: 0, message: 'Starting search...' },
      startTime: Date.now()
    });

    // Progress callback
    const progressCallback = (progress) => {
      const searchData = activeSearches.get(searchId);
      if (searchData) {
        searchData.progress = progress;
        searchData.status = progress.step === 'complete' ? 'completed' :
                           progress.step === 'error' ? 'error' : 'processing';
        activeSearches.set(searchId, searchData);
      }
    };

    // Start search with progress tracking
    const searchResult = await realTimeSearch.search(
      query.trim(),
      businessCategory,
      businessProfile,
      progressCallback
    );

    // Update final status
    const finalSearchData = activeSearches.get(searchId);
    if (finalSearchData) {
      finalSearchData.status = 'completed';
      finalSearchData.result = searchResult;
      activeSearches.set(searchId, finalSearchData);
    }

    res.json({
      success: true,
      data: {
        searchId,
        query: query.trim(),
        results: searchResult.results,
        metadata: {
          source: searchResult.source,
          responseTime: searchResult.responseTime,
          cached: searchResult.cached,
          stats: searchResult.stats
        }
      }
    });

  } catch (error) {
    console.error('❌ Real-time search error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: 'Real-time search failed'
    });
  }
});

// Progress tracking endpoint
app.get('/api/compliance/search-progress/:searchId', (req, res) => {
  try {
    const { searchId } = req.params;
    const searchData = activeSearches.get(searchId);

    if (!searchData) {
      return res.status(404).json({
        success: false,
        error: 'Search not found'
      });
    }

    res.json({
      success: true,
      data: searchData
    });

  } catch (error) {
    console.error('Error getting search progress:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Enhanced compliance analysis with real-time search
app.post('/api/compliance/analyze-enhanced', async (req, res) => {
  try {
    const frontendData = req.body;
    console.log('🔍 Enhanced compliance analysis for:', frontendData.businessName || frontendData.business_name);

    // Convert frontend data to backend BusinessProfile format
    const businessProfile = convertToBackendProfile(frontendData);

    // Step 1: Store business profile
    await storeBusinessProfile(businessProfile);

    // Step 2: Enhanced multi-query real-time search for relevant compliance rules
    let searchResults = [];
    if (realTimeSearch) {
      try {
        // Generate multiple targeted search queries
        const searchQueries = generateSearchQueries(businessProfile);
        console.log(`🔍 Generated ${searchQueries.length} targeted search queries`);

        // Execute multiple searches in parallel for better coverage
        const searchPromises = searchQueries.slice(0, 4).map(async (query, index) => {
          try {
            console.log(`🔍 Search ${index + 1}: "${query}"`);
            const result = await realTimeSearch.search(
              query,
              businessProfile.primary_industry,
              businessProfile,
              null // No progress callback for enhanced analysis
            );
            return result.results || [];
          } catch (error) {
            console.warn(`⚠️ Search ${index + 1} failed:`, error.message);
            return [];
          }
        });

        // Wait for all searches to complete
        const searchResultArrays = await Promise.all(searchPromises);

        // Combine and deduplicate results
        const combinedResults = searchResultArrays.flat();
        const uniqueResults = deduplicateRules(combinedResults);

        searchResults = uniqueResults;
        console.log(`📊 Multi-query search found ${searchResults.length} unique rules from ${combinedResults.length} total results`);

      } catch (searchError) {
        console.warn('⚠️ Enhanced search failed - no database fallback (real-time only):', searchError.message);
        searchResults = [];
      }
    } else {
      // No database fallback - real-time only
      console.log('❌ Real-time search unavailable - no results (database disabled)');
      searchResults = [];
    }

    console.log(`📋 Found ${searchResults.length} total matching rules`);

    // Step 3: Generate AI-powered compliance report
    console.log('🤖 Generating AI compliance report...');
    const aiReport = await Promise.race([
      generateComplianceReport(businessProfile, searchResults),
      new Promise((resolve) =>
        setTimeout(() => resolve('# Report Generation Timeout\n\nThe AI report generation took too long. Please see the compliance rules below.'), 20000)
      )
    ]);

    // Step 4: Calculate summary statistics
    const totalCost = searchResults.reduce((sum, rule) => {
      return sum + (rule.estimated_cost?.filing_fees || 0);
    }, 0);

    const priorityBreakdown = searchResults.reduce((acc, rule) => {
      acc[rule.priority] = (acc[rule.priority] || 0) + 1;
      return acc;
    }, {});

    const response = {
      business_profile: businessProfile,
      matching_rules: searchResults,
      ai_report: aiReport,
      summary: {
        total_rules: searchResults.length,
        estimated_total_cost: totalCost,
        priority_breakdown: priorityBreakdown,
        compliance_score: Math.max(0, 100 - (searchResults.length * 2)) // Simple scoring
      },
      metadata: {
        analysis_date: new Date().toISOString(),
        search_enhanced: !!realTimeSearch,
        processing_time: Date.now()
      }
    };

    res.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('❌ Enhanced compliance analysis error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Helper function to store rules in Firestore
async function storeRulesInFirestore(rules) {
  if (!rules || rules.length === 0) {
    console.log('⚠️ No rules to store');
    return { stored: 0, errors: 0 };
  }

  console.log(`💾 Storing ${rules.length} rules in Firestore...`);

  let stored = 0;
  let errors = 0;
  const batchSize = 100; // Smaller batches for reliability

  for (let i = 0; i < rules.length; i += batchSize) {
    const batch = rules.slice(i, i + batchSize);

    try {
      const batch_write = db.batch();

      for (const rule of batch) {
        const docRef = db.collection('compliance_rules').doc();
        batch_write.set(docRef, {
          ...rule,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }

      await batch_write.commit();
      stored += batch.length;
      console.log(`✅ Stored batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(rules.length/batchSize)} (${batch.length} rules)`);

    } catch (error) {
      console.error(`❌ Failed to store batch ${Math.floor(i/batchSize) + 1}:`, error);
      errors += batch.length;
    }
  }

  console.log(`💾 Storage complete: ${stored} stored, ${errors} errors`);
  return { stored, errors };
}

// Helper function to convert frontend business data to backend BusinessProfile format
function convertToBackendProfile(frontendData) {
  // Helper function to parse employee count from range strings
  const parseEmployeeCount = (employees) => {
    if (!employees) return 0;
    if (employees === '0') return 0;
    if (employees.includes('-')) {
      const parts = employees.split('-');
      return parseInt(parts[0]) || 0;
    }
    if (employees.includes('+')) {
      return parseInt(employees.replace('+', '')) || 0;
    }
    return parseInt(employees) || 0;
  };

  // Helper function to parse revenue from range strings
  const parseRevenue = (revenue) => {
    if (!revenue) return 0;
    if (revenue.includes('k')) {
      const num = parseInt(revenue.replace(/[k-]/g, ''));
      return num * 1000;
    }
    if (revenue.includes('m')) {
      const num = parseInt(revenue.replace(/[m-]/g, ''));
      return num * 1000000;
    }
    if (revenue.includes('+')) {
      return parseInt(revenue.replace(/[+$,]/g, '')) || 0;
    }
    return parseInt(revenue.replace(/[$,]/g, '')) || 0;
  };

  // Determine business type from industry and description
  const inferBusinessType = (industry, description) => {
    if (!industry && !description) return 'LLC'; // Default

    const text = `${industry} ${description}`.toLowerCase();

    if (text.includes('corporation') || text.includes('corp')) return 'Corporation';
    if (text.includes('llc')) return 'LLC';
    if (text.includes('partnership')) return 'Partnership';
    if (text.includes('sole proprietor') || text.includes('freelance')) return 'Sole Proprietorship';
    if (text.includes('non-profit') || text.includes('nonprofit')) return 'Non-Profit';

    // Default based on employee count
    const empCount = parseEmployeeCount(frontendData.employees);
    if (empCount > 50) return 'Corporation';
    if (empCount > 5) return 'LLC';
    return 'LLC'; // Most common default
  };

  return {
    session_id: frontendData.session_id,
    user_email: frontendData.user_email || '',

    // Basic Business Info
    business_name: frontendData.businessName || frontendData.business_name || '',
    business_type: inferBusinessType(frontendData.industry, frontendData.description || frontendData.businessDescription),
    formation_state: frontendData.state || frontendData.headquarters_state || '',

    // Size & Scale
    employee_count: parseEmployeeCount(frontendData.employees || frontendData.employeeCount),
    annual_revenue: parseRevenue(frontendData.revenue || frontendData.annualRevenue),
    revenue_currency: 'USD',

    // Industry Classification
    primary_industry: frontendData.industry || frontendData.primary_industry || '',
    secondary_industries: [],
    industry_description: frontendData.businessDescription || frontendData.description || frontendData.industry || '',

    // Location & Operations
    headquarters_state: frontendData.state || frontendData.headquarters_state || '',
    headquarters_city: frontendData.city || '',
    headquarters_county: '',

    operating_locations: [],

    // Business Activities - Parse from business description
    business_activities: frontendData.businessDescription ? [frontendData.businessDescription] : [],

    // Special Characteristics - Infer from description
    has_physical_location: true,
    has_employees: parseEmployeeCount(frontendData.employees || frontendData.employeeCount) > 0,
    handles_personal_data: (frontendData.businessDescription || '').toLowerCase().includes('customer') ||
                          (frontendData.businessDescription || '').toLowerCase().includes('personal') ||
                          (frontendData.businessDescription || '').toLowerCase().includes('data'),
    processes_payments: true,
    sells_online: (frontendData.businessDescription || '').toLowerCase().includes('online') ||
                  (frontendData.businessDescription || '').toLowerCase().includes('ecommerce') ||
                  (frontendData.businessDescription || '').toLowerCase().includes('website'),
    interstate_commerce: false,
    international_operations: (frontendData.businessDescription || '').toLowerCase().includes('international') ||
                              (frontendData.businessDescription || '').toLowerCase().includes('global'),

    // Compliance History
    existing_registrations: [],
    known_compliance_issues: [],

    // Metadata
    created_at: frontendData.created_at || new Date().toISOString(),
    updated_at: frontendData.updated_at || new Date().toISOString(),
    last_analysis: new Date().toISOString()
  };
}

// Enhanced search query generation with NLP and business activity analysis
function generateSearchQueries(businessProfile) {
  const queries = [];

  // Extract business activities from description
  const businessActivities = extractBusinessActivities(businessProfile.industry_description || '');
  const businessKeywords = extractBusinessKeywords(businessProfile.industry_description || '');

  console.log('🔍 Extracted business activities:', businessActivities);
  console.log('🔍 Extracted business keywords:', businessKeywords);

  // Query 1: Core business activities + compliance
  if (businessActivities.length > 0) {
    const activityQuery = businessActivities.slice(0, 3).join(' ') + ' compliance requirements';
    queries.push(activityQuery);
  }

  // Query 2: Industry + business type + state
  const industryQuery = [
    businessProfile.primary_industry,
    businessProfile.business_type,
    businessProfile.headquarters_state,
    'business requirements'
  ].filter(Boolean).join(' ');
  queries.push(industryQuery);

  // Query 3: Specific services + regulations
  if (businessKeywords.services.length > 0) {
    const serviceQuery = businessKeywords.services.slice(0, 2).join(' ') + ' regulations licensing';
    queries.push(serviceQuery);
  }

  // Query 4: Technology/Digital specific (if applicable)
  if (businessKeywords.technology.length > 0) {
    const techQuery = businessKeywords.technology.slice(0, 2).join(' ') + ' compliance data privacy';
    queries.push(techQuery);
  }

  // Query 4b: Transportation specific (if applicable)
  if (businessProfile.primary_industry && businessProfile.primary_industry.toLowerCase().includes('transportation')) {
    queries.push('commercial vehicle safety DOT regulations transportation licensing');
    queries.push('passenger transport safety requirements commercial driver license');
    if (businessProfile.has_employees) {
      queries.push('transportation worker employment law driver regulations');
    }
  }

  // Query 5: Employee-related (if has employees)
  if (businessProfile.has_employees) {
    queries.push(`employment law payroll tax ${businessProfile.headquarters_state}`);
  }

  // Query 6: Revenue/Tax specific
  if (businessProfile.annual_revenue > 0) {
    const revenueCategory = categorizeRevenue(businessProfile.annual_revenue);
    queries.push(`${revenueCategory} business tax requirements ${businessProfile.headquarters_state}`);
  }

  // Query 7: Online business specific (if detected)
  if (businessKeywords.online.length > 0) {
    queries.push('online business ecommerce compliance digital services regulations');
  }

  // Remove duplicates and empty queries
  const uniqueQueries = [...new Set(queries.filter(q => q && q.trim().length > 0))];

  console.log('🎯 Generated search queries:', uniqueQueries);
  return uniqueQueries;
}

// Extract business activities using NLP patterns
function extractBusinessActivities(description) {
  if (!description) return [];

  const text = description.toLowerCase();
  const activities = [];

  // Service patterns
  const servicePatterns = [
    /we (provide|offer|deliver|create|build|develop|design|manage|help|assist)/g,
    /our (services|solutions|products|offerings) (include|are|involve)/g,
    /specializ(e|ing) in ([\w\s]+)/g,
    /we are (a|an) ([\w\s]+) (company|business|firm)/g
  ];

  servicePatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => {
        // Extract the activity part
        const activity = match.replace(/we |our |specializ(e|ing) in |are |a |an |company|business|firm/g, '').trim();
        if (activity.length > 3) {
          activities.push(activity);
        }
      });
    }
  });

  // Common business activity keywords
  const activityKeywords = [
    'website development', 'web design', 'mobile app', 'software development',
    'digital marketing', 'online presence', 'ecommerce', 'consulting',
    'custom solutions', 'technical support', 'maintenance', 'hosting',
    'database management', 'cloud services', 'cybersecurity', 'IT services'
  ];

  activityKeywords.forEach(keyword => {
    if (text.includes(keyword)) {
      activities.push(keyword);
    }
  });

  return [...new Set(activities)];
}

// Extract categorized business keywords
function extractBusinessKeywords(description) {
  if (!description) return { services: [], technology: [], online: [], industry: [] };

  const text = description.toLowerCase();

  const keywords = {
    services: [],
    technology: [],
    online: [],
    industry: []
  };

  // Service keywords
  const serviceWords = [
    'design', 'development', 'consulting', 'support', 'maintenance',
    'training', 'implementation', 'integration', 'customization',
    'optimization', 'management', 'analysis', 'strategy'
  ];

  // Technology keywords
  const techWords = [
    'software', 'website', 'mobile', 'app', 'application', 'platform',
    'database', 'cloud', 'api', 'integration', 'automation', 'ai',
    'machine learning', 'blockchain', 'cybersecurity', 'data'
  ];

  // Online/Digital keywords
  const onlineWords = [
    'online', 'digital', 'internet', 'web', 'ecommerce', 'marketplace',
    'social media', 'seo', 'digital marketing', 'online presence'
  ];

  // Industry keywords
  const industryWords = [
    'healthcare', 'finance', 'retail', 'manufacturing', 'construction',
    'education', 'nonprofit', 'government', 'startup', 'enterprise',
    'transportation', 'logistics', 'delivery', 'shipping', 'freight',
    'passenger', 'commercial vehicle', 'trucking', 'taxi', 'rideshare'
  ];

  // Extract matching keywords
  serviceWords.forEach(word => {
    if (text.includes(word)) keywords.services.push(word);
  });

  techWords.forEach(word => {
    if (text.includes(word)) keywords.technology.push(word);
  });

  onlineWords.forEach(word => {
    if (text.includes(word)) keywords.online.push(word);
  });

  industryWords.forEach(word => {
    if (text.includes(word)) keywords.industry.push(word);
  });

  return keywords;
}

// Categorize revenue for tax purposes
function categorizeRevenue(revenue) {
  if (revenue < 50000) return 'small business';
  if (revenue < 250000) return 'medium business';
  if (revenue < 1000000) return 'large business';
  return 'enterprise business';
}

// Deduplicate rules based on title and authority
function deduplicateRules(rules) {
  const seen = new Set();
  const uniqueRules = [];

  for (const rule of rules) {
    // Create a unique key based on title and authority
    const key = `${rule.title?.toLowerCase() || ''}|${rule.authority?.toLowerCase() || ''}`;

    if (!seen.has(key)) {
      seen.add(key);
      uniqueRules.push(rule);
    }
  }

  return uniqueRules;
}

// Legacy function for backward compatibility
function generateSearchQuery(businessProfile) {
  const queries = generateSearchQueries(businessProfile);
  return queries[0] || 'business compliance requirements';
}

// Main compliance analysis endpoint with AI report generation
app.post('/api/compliance/analyze', async (req, res) => {
  try {
    const frontendData = req.body;
    console.log('🔍 Analyzing compliance for:', frontendData.businessName || frontendData.business_name);

    // Convert frontend data to backend BusinessProfile format
    const businessProfile = convertToBackendProfile(frontendData);
    
    // Step 1: Store business profile
    await storeBusinessProfile(businessProfile);

    // Step 2: Get matching rules from your Firebase database
    const matchingRules = await getMatchingRules(businessProfile);
    console.log(`📋 Found ${matchingRules.length} matching rules`);
    
    // Step 3: Generate AI-powered compliance report with timeout
    console.log('🤖 Generating AI compliance report...');
    const aiReport = await Promise.race([
      generateComplianceReport(businessProfile, matchingRules),
      new Promise((resolve) =>
        setTimeout(() => resolve('# Report Generation Timeout\n\nThe AI report generation took too long. Please see the compliance rules below.'), 20000)
      )
    ]);
    
    // Step 4: Calculate summary statistics
    const totalCost = matchingRules.reduce((sum, rule) => {
      return sum + (rule.estimated_cost || 0);
    }, 0);
    
    const priorityBreakdown = matchingRules.reduce((acc, rule) => {
      acc[rule.priority] = (acc[rule.priority] || 0) + 1;
      return acc;
    }, {});
    
    res.json({
      success: true,
      data: {
        business_profile: businessProfile,
        matching_rules: matchingRules,
        ai_report: aiReport,
        total_estimated_cost: totalCost,
        priority_breakdown: priorityBreakdown,
        analysis_timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('Error analyzing compliance:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// AI Report Generation Function
async function generateComplianceReport(businessProfile, matchingRules) {
  try {
    const prompt = `
Generate a comprehensive compliance report for the following business:

**Business Details:**
- Name: ${businessProfile.business_name}
- Type: ${businessProfile.business_type}
- State: ${businessProfile.headquarters_state}
- Industry: ${businessProfile.industry_description}
- Employees: ${businessProfile.employee_count}
- Revenue: $${businessProfile.annual_revenue.toLocaleString()}
- Has Employees: ${businessProfile.has_employees}
- Handles Personal Data: ${businessProfile.handles_personal_data}
- International Operations: ${businessProfile.international_operations}

**Applicable Compliance Rules (${matchingRules.length} found):**
${matchingRules.map(rule => `
- **${rule.title}** (${rule.priority} Priority)
  - Authority: ${rule.authority}
  - Level: ${rule.level}
  - Description: ${rule.description}
  - Estimated Cost: $${rule.estimated_cost || 0}
`).join('\n')}

Please generate a professional compliance report with the following sections:

## 📋 Executive Summary
Brief overview of compliance status and key requirements.

## 🚨 Critical Action Items
List the most urgent compliance requirements with deadlines.

## 📊 Compliance Overview
Summary of all applicable rules organized by priority and jurisdiction.

## 💰 Cost Analysis
Breakdown of estimated compliance costs and timeline.

## 📝 Recommended Next Steps
Prioritized action plan for achieving compliance.

## 🔗 Resources and Links
Relevant government websites and resources.

Format the response in clean markdown with proper headings, bullet points, and emphasis. Make it professional and actionable for a business owner.
`;

    // Generate AI report using OpenAI with timeout and error handling
    try {
      const OpenAI = require('openai');
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      console.log('🤖 Making OpenAI API call with gpt-5-nano...');

      const response = await Promise.race([
        openai.chat.completions.create({
          model: "gpt-5-nano",
          messages: [{ role: "user", content: prompt }],
          max_completion_tokens: 50000
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('OpenAI API timeout')), 15000)
        )
      ]);

      const aiResponse = response.choices[0]?.message?.content || '';
      console.log('✅ AI report generated successfully');
      return aiResponse;

    } catch (error) {
      console.error('❌ OpenAI API error:', error.message);

      // Return a fallback report if OpenAI fails
      return `# 📋 Compliance Analysis Report

## 🏢 Business Overview
**${businessProfile.business_name}** - ${businessProfile.business_type} in ${businessProfile.headquarters_state}

## 🚨 Critical Requirements Found
We've identified **${matchingRules.length} compliance requirements** that apply to your business:

${matchingRules.filter(r => r.priority === 'critical').map(rule => `
### ⚠️ ${rule.title}
- **Authority:** ${rule.authority}
- **Priority:** ${rule.priority}
- **Description:** ${rule.description}
- **Action Required:** Review and implement compliance measures
`).join('\n')}

## 📊 Summary
- **Total Rules:** ${matchingRules.length}
- **Critical Priority:** ${matchingRules.filter(r => r.priority === 'critical').length}
- **High Priority:** ${matchingRules.filter(r => r.priority === 'high').length}

## 📝 Next Steps
1. **Review each compliance requirement** listed below
2. **Prioritize critical and high-priority items** first
3. **Consult with legal professionals** for complex requirements
4. **Implement compliance measures** systematically
5. **Keep records** of all compliance activities

## ⚖️ Legal Disclaimer
*This analysis is for informational purposes only and does not constitute legal advice. Please consult with qualified legal professionals for specific compliance guidance.*

---
*Report generated automatically from your business profile and applicable regulations.*`;
    }
    
  } catch (error) {
    console.error('Error generating AI report:', error);
    return `# Compliance Analysis Report

## Executive Summary
Based on your business profile, we've identified ${matchingRules.length} applicable compliance requirements.

## Critical Requirements
${matchingRules.filter(r => r.priority === 'critical').map(rule => `
- **${rule.title}**
  - Authority: ${rule.authority}
  - Action Required: ${rule.description}
`).join('\n')}

## Next Steps
1. Review each compliance requirement carefully
2. Prioritize critical and high-priority items
3. Consult with legal professionals for complex requirements
4. Implement compliance measures systematically

*This report was generated automatically. Please consult with legal professionals for specific compliance advice.*
`;
  }
}

// AI Rule Generation endpoints
app.post('/api/ai/generate-federal-rules', async (req, res) => {
  try {
    const { count = 10 } = req.body;
    const rules = await aiGenerator.generateFederalRules(count);

    res.json({
      success: true,
      data: {
        rules,
        generation_time: 2.5,
        total_cost: 0.05
      }
    });
  } catch (error) {
    console.error('Error generating federal rules:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Global variable to track scraping status
let currentScrapingStatus = null;

// Government Website Scraping endpoint
app.post('/api/scrape/government-rules', async (req, res) => {
  try {
    const { targetRuleCount = 200 } = req.body;

    // Check if scraping is already in progress
    if (currentScrapingStatus && currentScrapingStatus.status === 'in_progress') {
      return res.json({
        success: true,
        data: {
          message: 'Scraping already in progress',
          ...currentScrapingStatus
        }
      });
    }

    console.log('🕷️ Starting government API data collection...');

    // Initialize status tracking
    currentScrapingStatus = {
      status: 'in_progress',
      targetRuleCount,
      startTime: new Date().toISOString(),
      progress: {
        totalCollected: 0,
        totalProcessed: 0,
        totalStored: 0,
        currentPhase: 'initializing'
      }
    };

    // Import the scraper
    const { GovernmentScraper } = require('./src/services/GovernmentScraper.js');

    // Create simple Firestore service for the scraper
    const simpleFirestoreService = {
      storeRules: async (rules) => {
        console.log(`💾 Storing ${rules.length} scraped rules in Firestore...`);
        currentScrapingStatus.progress.currentPhase = 'storing_rules';

        const batchSize = 500;
        for (let i = 0; i < rules.length; i += batchSize) {
          const batch = rules.slice(i, i + batchSize);
          const firestoreBatch = db.batch();

          for (const rule of batch) {
            const ruleRef = db.collection('compliance_rules').doc(rule.id);
            firestoreBatch.set(ruleRef, {
              ...rule,
              created_at: admin.firestore.FieldValue.serverTimestamp(),
              updated_at: admin.firestore.FieldValue.serverTimestamp()
            });
          }

          await firestoreBatch.commit();
          console.log(`✅ Stored batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(rules.length/batchSize)}`);
        }

        console.log(`✅ Successfully stored ${rules.length} scraped rules`);
      }
    };

    const scraper = new GovernmentScraper(
      process.env.OPENAI_API_KEY,
      simpleFirestoreService,
      process.env.REGULATIONS_API_KEY
    );

    // Start scraping in background
    scraper.scrapeAndStoreRules(targetRuleCount)
      .then((stats) => {
        console.log('✅ Government scraping completed successfully');
        currentScrapingStatus = {
          ...currentScrapingStatus,
          status: 'completed',
          endTime: new Date().toISOString(),
          finalStats: stats,
          progress: {
            totalCollected: stats.totalCollected,
            totalProcessed: stats.totalProcessed,
            totalStored: stats.totalStored,
            currentPhase: 'completed'
          }
        };
      })
      .catch((error) => {
        console.error('❌ Government scraping failed:', error);
        currentScrapingStatus = {
          ...currentScrapingStatus,
          status: 'error',
          endTime: new Date().toISOString(),
          error: error.message,
          progress: {
            ...currentScrapingStatus.progress,
            currentPhase: 'error'
          }
        };
      });

    // Return immediately with status
    res.json({
      success: true,
      data: {
        message: `Government API data collection started (target: ${targetRuleCount} rules)`,
        targetRuleCount,
        status: 'in_progress',
        estimatedTime: '3-5 minutes',
        statusEndpoint: '/api/scrape/status'
      }
    });

  } catch (error) {
    console.error('Error starting government scraping:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get scraping status endpoint with detailed progress
app.get('/api/scrape/status', async (req, res) => {
  try {
    // Get current scraping status
    const status = currentScrapingStatus || {
      status: 'idle',
      message: 'No scraping operation in progress'
    };

    // Get recent rules to show progress (simplified query to avoid index issues)
    const recentRules = await db
      .collection('compliance_rules')
      .orderBy('created_at', 'desc')
      .limit(20)
      .get();

    const scrapedRules = recentRules.docs
      .filter(doc => {
        const data = doc.data();
        return data.sources && data.sources[0] &&
               (data.sources[0].source_type === 'government_website' ||
                data.sources[0].source_type === 'api');
      })
      .slice(0, 10)
      .map(doc => ({
        id: doc.id,
        title: doc.data().title,
        authority: doc.data().authority,
        industries: doc.data().applicability_criteria?.industries || ['ALL'],
        created_at: doc.data().created_at
      }));

    // Get total count of all rules (simplified)
    const totalScrapedQuery = await db
      .collection('compliance_rules')
      .get();

    // Calculate completion percentage if scraping is in progress
    let completionPercentage = 0;
    if (status.status === 'in_progress' && status.targetRuleCount) {
      completionPercentage = Math.min(
        (status.progress?.totalStored || 0) / status.targetRuleCount * 100,
        100
      );
    } else if (status.status === 'completed') {
      completionPercentage = 100;
    }

    res.json({
      success: true,
      data: {
        // Current operation status
        currentOperation: status,
        completionPercentage: Math.round(completionPercentage),

        // Historical data
        recentlyScrapedRules: scrapedRules,
        totalScrapedRules: totalScrapedQuery.size,

        // API exhaustion status
        apiStatus: {
          regulationsGovAvailable: !!process.env.REGULATIONS_API_KEY,
          lastCollectionStats: status.finalStats || null
        },

        // Recommendations
        recommendations: getScrapingRecommendations(status, totalScrapedQuery.size)
      }
    });

  } catch (error) {
    console.error('Error getting scraping status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Helper function to provide scraping recommendations
function getScrapingRecommendations(status, totalRules) {
  const recommendations = [];

  if (status.status === 'completed' && status.finalStats) {
    const stats = status.finalStats;

    if (stats.sources?.regulations_gov?.completionStatus === 'fully_exhausted') {
      recommendations.push({
        type: 'info',
        message: 'All available rules from Regulations.gov have been collected'
      });
    } else if (stats.sources?.regulations_gov?.completionStatus === 'target_reached') {
      recommendations.push({
        type: 'suggestion',
        message: 'More rules may be available. Consider running collection again with a higher target'
      });
    }

    if (stats.duplicatesSkipped > 0) {
      recommendations.push({
        type: 'info',
        message: `${stats.duplicatesSkipped} duplicate rules were automatically skipped`
      });
    }
  }

  if (totalRules < 100) {
    recommendations.push({
      type: 'suggestion',
      message: 'Consider running collection multiple times to build a comprehensive rule database'
    });
  }

  return recommendations;
}

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Compliance API Server running on http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔍 Ready to analyze compliance requirements!`);
});

module.exports = app;
