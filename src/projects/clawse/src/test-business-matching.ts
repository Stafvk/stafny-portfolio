import dotenv from 'dotenv';
import { FirestoreService } from './services/FirestoreService';
import { BusinessProfile } from './types/ComplianceRule';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

async function testBusinessMatching() {
  console.log('🎯 Testing Business Profile Matching');
  console.log('====================================\n');

  try {
    const firestoreService = new FirestoreService();

    // Test different business profiles
    const testProfiles: BusinessProfile[] = [
      {
        session_id: uuidv4(),
        business_name: 'Tech Startup LLC',
        business_type: 'LLC',
        formation_state: 'Delaware',
        employee_count: 5,
        annual_revenue: 500000,
        revenue_currency: 'USD',
        primary_industry: '541511', // Computer Systems Design
        secondary_industries: ['541512'],
        industry_description: 'Software Development',
        headquarters_state: 'California',
        headquarters_city: 'San Francisco',
        operating_locations: [],
        business_activities: ['software_development', 'consulting'],
        has_physical_location: true,
        has_employees: true,
        handles_personal_data: true,
        processes_payments: true,
        sells_online: true,
        interstate_commerce: true,
        international_operations: false,
        existing_registrations: [],
        known_compliance_issues: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_analysis: new Date().toISOString()
      },
      {
        session_id: uuidv4(),
        business_name: 'Local Restaurant Corp',
        business_type: 'Corp',
        formation_state: 'California',
        employee_count: 15,
        annual_revenue: 800000,
        revenue_currency: 'USD',
        primary_industry: '722513', // Limited-Service Restaurants
        secondary_industries: [],
        industry_description: 'Fast Casual Restaurant',
        headquarters_state: 'California',
        headquarters_city: 'Los Angeles',
        operating_locations: [],
        business_activities: ['food_service', 'retail'],
        has_physical_location: true,
        has_employees: true,
        handles_personal_data: true,
        processes_payments: true,
        sells_online: false,
        interstate_commerce: false,
        international_operations: false,
        existing_registrations: ['EIN'],
        known_compliance_issues: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_analysis: new Date().toISOString()
      },
      {
        session_id: uuidv4(),
        business_name: 'Solo Consulting',
        business_type: 'Sole Proprietorship',
        formation_state: 'Texas',
        employee_count: 1,
        annual_revenue: 75000,
        revenue_currency: 'USD',
        primary_industry: '541611', // Administrative Management Consulting
        secondary_industries: [],
        industry_description: 'Business Consulting',
        headquarters_state: 'Texas',
        headquarters_city: 'Austin',
        operating_locations: [],
        business_activities: ['consulting'],
        has_physical_location: false,
        has_employees: false,
        handles_personal_data: false,
        processes_payments: true,
        sells_online: true,
        interstate_commerce: true,
        international_operations: false,
        existing_registrations: [],
        known_compliance_issues: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_analysis: new Date().toISOString()
      }
    ];

    // Test each business profile
    for (let i = 0; i < testProfiles.length; i++) {
      const profile = testProfiles[i];
      console.log(`\n🏢 Testing Profile ${i + 1}: ${profile.business_name}`);
      console.log('─'.repeat(50));
      console.log(`Type: ${profile.business_type}`);
      console.log(`State: ${profile.headquarters_state}`);
      console.log(`Employees: ${profile.employee_count}`);
      console.log(`Revenue: $${profile.annual_revenue.toLocaleString()}`);
      console.log(`Industry: ${profile.industry_description} (${profile.primary_industry})`);

      const startTime = Date.now();
      
      // Find matching rules
      const matchingRules = await firestoreService.getMatchingRules(profile);
      
      const endTime = Date.now();
      const queryTime = endTime - startTime;

      console.log(`\n📋 Found ${matchingRules.length} matching rules (${queryTime}ms)`);

      if (matchingRules.length > 0) {
        console.log('\n🎯 Top Matching Rules:');
        matchingRules.slice(0, 5).forEach((rule, index) => {
          console.log(`${index + 1}. ${rule.title}`);
          console.log(`   Authority: ${rule.authority} (${rule.level})`);
          console.log(`   Priority: ${rule.priority}`);
          console.log(`   Steps: ${rule.compliance_steps?.length || 0}`);
          
          if (rule.estimated_cost) {
            console.log(`   Filing Fee: $${rule.estimated_cost.filing_fees || 0}`);
          }
          
          console.log('');
        });

        // Analyze rule distribution
        const rulesByLevel = matchingRules.reduce((acc, rule) => {
          acc[rule.level] = (acc[rule.level] || 0) + 1;
          return acc;
        }, {} as {[key: string]: number});

        const rulesByPriority = matchingRules.reduce((acc, rule) => {
          acc[rule.priority] = (acc[rule.priority] || 0) + 1;
          return acc;
        }, {} as {[key: string]: number});

        console.log('📊 Rule Distribution:');
        console.log(`   By Level: ${JSON.stringify(rulesByLevel)}`);
        console.log(`   By Priority: ${JSON.stringify(rulesByPriority)}`);

        // Calculate estimated costs
        const totalFilingFees = matchingRules.reduce((sum, rule) => 
          sum + (rule.estimated_cost?.filing_fees || 0), 0);
        const totalOngoingCosts = matchingRules.reduce((sum, rule) => 
          sum + (rule.estimated_cost?.ongoing_costs || 0), 0);

        console.log('💰 Estimated Costs:');
        console.log(`   Initial Filing Fees: $${totalFilingFees}`);
        console.log(`   Annual Ongoing Costs: $${totalOngoingCosts}`);
        console.log(`   Total First Year: $${totalFilingFees + totalOngoingCosts}`);

      } else {
        console.log('⚠️  No matching rules found for this business profile');
      }
    }

    // Get overall statistics
    console.log('\n📈 OVERALL STATISTICS');
    console.log('=====================');
    
    const stats = await firestoreService.getCollectionStats();
    console.log('Database Collections:');
    Object.entries(stats).forEach(([collection, count]) => {
      console.log(`   ${collection}: ${count} documents`);
    });

    // Test simple searches
    console.log('\n🔍 SEARCH TESTS');
    console.log('===============');
    
    const searchTests = [
      { businessType: 'LLC', state: 'CA' },
      { businessType: 'Corp', state: 'TX' },
      { businessType: 'Sole Proprietorship', state: 'NY' }
    ];

    for (const search of searchTests) {
      const searchResults = await firestoreService.searchRules(
        search.businessType, 
        search.state, 
        10
      );
      console.log(`${search.businessType} in ${search.state}: ${searchResults.length} rules`);
    }

    console.log('\n✅ Business matching test completed successfully!');

  } catch (error) {
    console.error('❌ Error in business matching test:', error);
    throw error;
  }
}

// Run the test
if (require.main === module) {
  testBusinessMatching()
    .then(() => {
      console.log('\n🎉 All tests completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test failed:', error);
      process.exit(1);
    });
}

export { testBusinessMatching };
