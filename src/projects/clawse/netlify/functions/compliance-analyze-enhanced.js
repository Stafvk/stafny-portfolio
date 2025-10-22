const admin = require('firebase-admin');

// Initialize Firebase
const initFirebase = () => {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
    });
  }
  return admin.firestore();
};

// Import RealTimeComplianceSearch
let RealTimeComplianceSearch;
try {
  RealTimeComplianceSearch = require('./shared/RealTimeComplianceSearch').RealTimeComplianceSearch;
} catch (error) {
  console.error('Could not import RealTimeComplianceSearch:', error);
}

// Initialize Real-Time Search
let realTimeSearch = null;
const initRealTimeSearch = (db) => {
  if (!realTimeSearch && RealTimeComplianceSearch) {
    const simpleFirestoreService = {
      db: db,
      async getMatchingRules(businessProfile) {
        // COMPLETELY SKIP database search - real-time only
        console.log('🚫 Database search disabled - using real-time only');
        return [];
      },
      async storeRules(rules) {
        // COMPLETELY DISABLED for real-time only
        console.log(`🚫 Rule storage disabled - ${rules.length} rules processed in real-time only`);
        return;
      },
      async getAllRules() {
        // COMPLETELY SKIP database query
        console.log('🚫 Database query disabled - using real-time only');
        return [];
      }
    };

    realTimeSearch = new RealTimeComplianceSearch(
      process.env.OPENAI_API_KEY,
      simpleFirestoreService,
      process.env.REGULATIONS_API_KEY
    );
  }
  return realTimeSearch;
};

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const db = initFirebase();
    const rtSearch = initRealTimeSearch(db);
    
    if (!rtSearch) {
      throw new Error('Real-time search service not available');
    }

    const frontendData = JSON.parse(event.body);
    console.log('🔍 Enhanced compliance analysis for:', frontendData.businessName);

    // Convert frontend data to business profile
    const businessProfile = {
      business_name: frontendData.businessName,
      business_type: frontendData.businessType,
      primary_industry: frontendData.industry,
      headquarters_state: frontendData.state,
      employee_count: frontendData.employees,
      annual_revenue: frontendData.revenue,
      business_description: frontendData.businessDescription || frontendData.description,
      session_id: frontendData.session_id || `session_${Date.now()}`,
      created_at: frontendData.created_at || new Date().toISOString(),
      updated_at: frontendData.updated_at || new Date().toISOString()
    };

    // Real-time search only (no database)
    console.log('🔍 Using real-time search only (no database storage)...');
    
    // Single comprehensive search instead of multiple queries
    const primaryQuery = `${businessProfile.business_type} ${businessProfile.primary_industry} ${businessProfile.headquarters_state} employment law payroll tax business requirements`;

    console.log(`🔍 Single comprehensive search: "${primaryQuery}"`);

    let allResults = [];
    try {
      const searchResults = await rtSearch.search(primaryQuery, businessProfile.primary_industry, businessProfile);
      allResults = searchResults.results || [];
      console.log(`📊 Single search found ${allResults.length} rules`);

    } catch (error) {
      console.error('❌ Search failed:', error);
      allResults = [];
    }

    // Generate AI report
    console.log('🤖 Generating AI compliance report...');
    let aiReport = '';

    if (allResults.length > 0) {
      try {
        aiReport = await rtSearch.generateComplianceReport(businessProfile, allResults);
        console.log('✅ AI report generated successfully');
      } catch (error) {
        console.error('❌ AI report generation failed:', error);
        aiReport = `# Compliance Analysis for ${businessProfile.business_name}

## Summary
We found ${searchResults.length} compliance requirements that may apply to your business. Due to a temporary issue with our AI analysis service, please review the individual rules below for detailed compliance information.

## Next Steps
1. Review each compliance requirement carefully
2. Consult with legal counsel for specific guidance
3. Implement necessary compliance measures
4. Set up monitoring for regulatory changes`;
      }
    } else {
      aiReport = `# Compliance Analysis for ${businessProfile.business_name}

## Summary
No specific compliance requirements were found in our current search. This could mean:
- Your business type and location have minimal regulatory requirements
- The search terms may need refinement
- Some regulations may not be captured in our current data sources

## Recommendations
1. Consult with a local business attorney
2. Check with your state's business registration office
3. Review industry-specific regulations
4. Consider common business requirements like business licenses and tax obligations`;
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        data: {
          matching_rules: allResults,
          ai_report: aiReport,
          metadata: {
            search_enhanced: true,
            total_queries: 1,
            total_results: allResults.length,
            unique_results: allResults.length,
            timestamp: new Date().toISOString()
          }
        }
      })
    };

  } catch (error) {
    console.error('❌ Enhanced compliance analysis error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: false,
        error: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};
