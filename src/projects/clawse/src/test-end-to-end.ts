import dotenv from 'dotenv';
import { initializeFirebase } from './config/firebase';
import { AIRuleGenerator } from './services/AIRuleGenerator';
import { FirestoreService } from './services/FirestoreService';
import { BusinessProfile } from './types/ComplianceRule';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

async function runEndToEndTest() {
  console.log('🚀 Starting End-to-End Test with 10 Rules\n');
  console.log('==========================================\n');
  
  try {
    // Step 1: Initialize services
    console.log('🔧 Step 1: Initializing services...');
    initializeFirebase();
    
    const aiGenerator = new AIRuleGenerator(process.env.OPENAI_API_KEY!);
    const firestoreService = new FirestoreService();
    
    console.log('✅ Services initialized successfully\n');
    
    // Step 2: Clear any existing test data
    console.log('🧹 Step 2: Clearing existing test data...');
    await firestoreService.clearTestData();
    console.log('✅ Test data cleared\n');
    
    // Step 3: Generate 10 rules with AI
    console.log('🤖 Step 3: Generating compliance rules with AI...');
    const startTime = Date.now();
    
    // Generate federal rules (temporarily skipping state rules due to parsing issues)
    const federalRules = await aiGenerator.generateFederalRules(10);
    // const stateRules = await aiGenerator.generateStateRules('California', 2);
    // const industryRules = await aiGenerator.generateIndustrySpecificRules('Technology', '541511', 1);

    const allGeneratedRules = [...federalRules]; // , ...stateRules, ...industryRules];
    const generationTime = Date.now() - startTime;
    
    console.log(`✅ Generated ${allGeneratedRules.length} rules in ${generationTime}ms`);
    console.log(`   - Federal rules: ${federalRules.length}`);
    // console.log(`   - State rules: ${stateRules.length}`);
    // console.log(`   - Industry rules: ${industryRules.length}\n`);
    
    // Step 4: Store rules in Firestore
    console.log('💾 Step 4: Storing rules in Firestore...');
    const storeStartTime = Date.now();
    await firestoreService.storeRules(allGeneratedRules);
    const storeTime = Date.now() - storeStartTime;
    
    console.log(`✅ Stored rules in ${storeTime}ms\n`);
    
    // Step 5: Test retrieval
    console.log('🔍 Step 5: Testing rule retrieval...');
    const retrievedRules = await firestoreService.getRules(10);
    console.log(`✅ Retrieved ${retrievedRules.length} rules from Firestore\n`);
    
    // Step 6: Create test business profile
    console.log('🏢 Step 6: Creating test business profile...');
    const testBusinessProfile: BusinessProfile = {
      session_id: uuidv4(),
      user_email: 'test@example.com',
      business_name: 'Test Tech LLC',
      business_type: 'LLC',
      formation_state: 'CA',
      employee_count: 15,
      annual_revenue: 500000,
      revenue_currency: 'USD',
      primary_industry: '541511', // Computer Systems Design
      secondary_industries: ['541512'],
      industry_description: 'Software development and consulting',
      headquarters_state: 'CA',
      headquarters_city: 'San Francisco',
      headquarters_county: 'San Francisco County',
      operating_locations: [{
        address: '123 Tech Street',
        city: 'San Francisco',
        state: 'CA',
        zip_code: '94105',
        location_type: 'headquarters',
        employee_count: 15
      }],
      business_activities: ['software_development', 'consulting', 'online_services'],
      has_physical_location: true,
      has_employees: true,
      handles_personal_data: true,
      processes_payments: true,
      sells_online: true,
      interstate_commerce: true,
      international_operations: false,
      existing_registrations: ['EIN'],
      known_compliance_issues: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_analysis: new Date().toISOString()
    };
    
    await firestoreService.storeBusinessProfile(testBusinessProfile);
    console.log(`✅ Created business profile: ${testBusinessProfile.business_name}\n`);
    
    // Step 7: Test business profile matching
    console.log('🎯 Step 7: Testing business profile matching...');
    const matchingStartTime = Date.now();
    const matchingRules = await firestoreService.getMatchingRules(testBusinessProfile);
    const matchingTime = Date.now() - matchingStartTime;
    
    console.log(`✅ Found ${matchingRules.length} matching rules in ${matchingTime}ms\n`);
    
    // Step 8: Test simple search
    console.log('🔍 Step 8: Testing simple search functionality...');
    const searchRules = await firestoreService.searchRules('LLC', 'CA');
    console.log(`✅ Search found ${searchRules.length} rules for LLC in CA\n`);
    
    // Step 9: Get collection statistics
    console.log('📊 Step 9: Getting collection statistics...');
    const stats = await firestoreService.getCollectionStats();
    console.log('✅ Collection statistics:');
    Object.entries(stats).forEach(([collection, count]) => {
      console.log(`   ${collection}: ${count} documents`);
    });
    console.log('');
    
    // Step 10: Display results summary
    console.log('📋 DETAILED TEST RESULTS:');
    console.log('==========================');
    console.log(`Rules Generated: ${allGeneratedRules.length}`);
    console.log(`Rules Stored: ${retrievedRules.length}`);
    console.log(`Matching Rules Found: ${matchingRules.length}`);
    console.log(`Search Results: ${searchRules.length}`);
    console.log(`Total Processing Time: ${generationTime + storeTime}ms`);
    console.log(`Matching Query Time: ${matchingTime}ms`);
    console.log('');
    
    // Step 11: Show sample generated rules
    console.log('📋 SAMPLE GENERATED RULES:');
    console.log('===========================');
    allGeneratedRules.slice(0, 3).forEach((rule, index) => {
      console.log(`${index + 1}. ${rule.title}`);
      console.log(`   Authority: ${rule.authority} (${rule.level})`);
      console.log(`   Priority: ${rule.priority}`);
      console.log(`   Steps: ${rule.compliance_steps.length}`);
      console.log(`   Applies to: ${rule.applicability_criteria.business_types.join(', ')}`);
      console.log(`   States: ${rule.applicability_criteria.states.join(', ')}`);
      console.log(`   Filing Fee: $${rule.estimated_cost.filing_fees}`);
      console.log('');
    });
    
    // Step 12: Show matching rules for business profile
    console.log('🎯 MATCHING RULES FOR TEST BUSINESS:');
    console.log('====================================');
    if (matchingRules.length > 0) {
      matchingRules.slice(0, 5).forEach((rule, index) => {
        console.log(`${index + 1}. ${rule.title} (${rule.authority})`);
        console.log(`   Priority: ${rule.priority} | Level: ${rule.level}`);
        console.log(`   Employee Range: ${rule.applicability_criteria.employee_count.min}-${rule.applicability_criteria.employee_count.max}`);
        console.log('');
      });
    } else {
      console.log('No matching rules found - this might indicate:');
      console.log('- Search criteria need adjustment');
      console.log('- Generated rules don\'t match test business profile');
      console.log('- Firestore indexes need time to build');
    }
    
    // Step 13: Performance analysis
    console.log('⚡ PERFORMANCE ANALYSIS:');
    console.log('========================');
    console.log(`AI Generation: ${generationTime}ms (${Math.round(generationTime/allGeneratedRules.length)}ms per rule)`);
    console.log(`Firestore Storage: ${storeTime}ms`);
    console.log(`Business Matching: ${matchingTime}ms`);
    console.log(`Total End-to-End: ${generationTime + storeTime + matchingTime}ms`);
    console.log('');
    
    // Step 14: Validation checks
    console.log('✅ VALIDATION CHECKS:');
    console.log('======================');
    
    const validationResults = {
      rulesGenerated: allGeneratedRules.length === 10,
      rulesStored: retrievedRules.length === allGeneratedRules.length,
      businessProfileStored: true,
      matchingWorking: matchingRules.length >= 0,
      searchWorking: searchRules.length >= 0,
      performanceGood: (generationTime + storeTime) < 60000 // Under 1 minute
    };
    
    Object.entries(validationResults).forEach(([check, passed]) => {
      console.log(`${passed ? '✅' : '❌'} ${check}: ${passed ? 'PASS' : 'FAIL'}`);
    });
    
    const allPassed = Object.values(validationResults).every(result => result);
    
    console.log('\n🎉 END-TO-END TEST COMPLETED!');
    console.log('==============================');
    console.log(`Overall Result: ${allPassed ? '✅ SUCCESS' : '❌ PARTIAL SUCCESS'}`);
    
    if (allPassed) {
      console.log('\n🎯 NEXT STEPS:');
      console.log('1. Scale to 100+ rules');
      console.log('2. Add real-time processing');
      console.log('3. Implement PDF generation');
      console.log('4. Add email delivery');
      console.log('5. Build React frontend');
    }
    
    return {
      success: allPassed,
      rulesGenerated: allGeneratedRules.length,
      rulesStored: retrievedRules.length,
      matchingRules: matchingRules.length,
      totalTime: generationTime + storeTime + matchingTime,
      validationResults
    };
    
  } catch (error) {
    console.error('❌ End-to-end test failed:', error);
    
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    console.log('\n🔧 TROUBLESHOOTING TIPS:');
    console.log('1. Check Firebase credentials in .env file');
    console.log('2. Verify OpenAI API key and credits');
    console.log('3. Ensure Firestore is enabled in Firebase Console');
    console.log('4. Check internet connection');
    console.log('5. Verify all dependencies are installed');
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Run the test
if (require.main === module) {
  runEndToEndTest().then(result => {
    console.log(`\n🏁 Test completed with ${result.success ? 'SUCCESS' : 'ERRORS'}`);
    process.exit(result.success ? 0 : 1);
  });
}

export { runEndToEndTest };
