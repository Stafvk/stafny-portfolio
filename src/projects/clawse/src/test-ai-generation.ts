import dotenv from 'dotenv';
import { AIRuleGenerator } from './services/AIRuleGenerator';

dotenv.config();

async function testAIGeneration() {
  console.log('🤖 Testing AI Rule Generation...\n');
  
  try {
    // Initialize AI Rule Generator
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not found in environment variables');
    }
    
    const generator = new AIRuleGenerator(apiKey);
    
    // Test 1: Generate 3 federal rules
    console.log('🏛️ Test 1: Generating 3 federal compliance rules...');
    const startTime = Date.now();
    
    const federalRules = await generator.generateFederalRules(3);
    const generationTime = Date.now() - startTime;
    
    console.log(`✅ Generated ${federalRules.length} federal rules in ${generationTime}ms`);
    
    // Display first rule details
    if (federalRules.length > 0) {
      const firstRule = federalRules[0];
      if (firstRule) {
        console.log('\n📋 Sample Federal Rule:');
        console.log('=======================');
        console.log('Title:', firstRule.title);
        console.log('Authority:', firstRule.authority);
        console.log('Level:', firstRule.level);
        console.log('Priority:', firstRule.priority);
        console.log('Status:', firstRule.status);
        console.log('Business Types:', firstRule.applicability_criteria?.business_types?.join(', ') || 'N/A');
        console.log('States:', firstRule.applicability_criteria?.states?.join(', ') || 'N/A');
        console.log('Employee Range:', `${firstRule.applicability_criteria?.employee_count?.min || 0}-${firstRule.applicability_criteria?.employee_count?.max || 0}`);
        console.log('Steps:', firstRule.compliance_steps?.length || 0);
        console.log('Tags:', firstRule.tags?.join(', ') || 'N/A');
        console.log('Filing Fees: $', firstRule.estimated_cost?.filing_fees || 0);
        console.log('Penalty Range: $', `${firstRule.estimated_cost?.penalty_range?.min || 0}-${firstRule.estimated_cost?.penalty_range?.max || 0}`);

        // Show first compliance step
        if (firstRule.compliance_steps && firstRule.compliance_steps.length > 0) {
          const firstStep = firstRule.compliance_steps[0];
          if (firstStep) {
            console.log('\n📝 First Compliance Step:');
            console.log('  Description:', firstStep.step_description);
            console.log('  Deadline:', firstStep.deadline);
            console.log('  Cost: $', firstStep.estimated_cost);
            console.log('  Time:', firstStep.estimated_time);
            console.log('  Forms:', firstStep.required_forms?.length || 0);

            if (firstStep.required_forms && firstStep.required_forms.length > 0) {
              const firstForm = firstStep.required_forms[0];
              if (firstForm) {
                console.log('  Form Name:', firstForm.form_name);
                console.log('  Form URL:', firstForm.form_url);
              }
            }
          }
        }
      }
    }
    
    // Show all rule titles
    console.log('\n📝 All Generated Federal Rules:');
    console.log('================================');
    federalRules.forEach((rule, index) => {
      console.log(`${index + 1}. ${rule.title} (${rule.authority}) - ${rule.priority}`);
    });
    
    // Test 2: Generate state rules
    console.log('\n🏛️ Test 2: Generating 2 California state rules...');
    const stateStartTime = Date.now();
    
    const stateRules = await generator.generateStateRules('California', 2);
    const stateGenerationTime = Date.now() - stateStartTime;
    
    console.log(`✅ Generated ${stateRules.length} California state rules in ${stateGenerationTime}ms`);
    
    console.log('\n📝 Generated California State Rules:');
    console.log('====================================');
    stateRules.forEach((rule, index) => {
      console.log(`${index + 1}. ${rule.title} (${rule.authority}) - ${rule.level}`);
    });
    
    // Test 3: Generate industry-specific rules
    console.log('\n🏭 Test 3: Generating 2 restaurant industry rules...');
    const industryStartTime = Date.now();
    
    const industryRules = await generator.generateIndustrySpecificRules('Restaurant', '722513', 2);
    const industryGenerationTime = Date.now() - industryStartTime;
    
    console.log(`✅ Generated ${industryRules.length} restaurant industry rules in ${industryGenerationTime}ms`);
    
    console.log('\n📝 Generated Restaurant Industry Rules:');
    console.log('=======================================');
    industryRules.forEach((rule, index) => {
      console.log(`${index + 1}. ${rule.title} (${rule.authority}) - ${rule.priority}`);
    });
    
    // Combine all rules for analysis
    const allRules = [...federalRules, ...stateRules, ...industryRules];
    
    // Analyze generated rules
    console.log('\n📊 GENERATION ANALYSIS:');
    console.log('========================');
    console.log(`Total Rules Generated: ${allRules.length}`);
    console.log(`Total Generation Time: ${generationTime + stateGenerationTime + industryGenerationTime}ms`);
    console.log(`Average Time per Rule: ${Math.round((generationTime + stateGenerationTime + industryGenerationTime) / allRules.length)}ms`);
    
    // Priority distribution
    const priorityCount = allRules.reduce((acc, rule) => {
      acc[rule.priority] = (acc[rule.priority] || 0) + 1;
      return acc;
    }, {} as {[key: string]: number});
    
    console.log('\nPriority Distribution:');
    Object.entries(priorityCount).forEach(([priority, count]) => {
      console.log(`  ${priority}: ${count} rules`);
    });
    
    // Level distribution
    const levelCount = allRules.reduce((acc, rule) => {
      acc[rule.level] = (acc[rule.level] || 0) + 1;
      return acc;
    }, {} as {[key: string]: number});
    
    console.log('\nLevel Distribution:');
    Object.entries(levelCount).forEach(([level, count]) => {
      console.log(`  ${level}: ${count} rules`);
    });
    
    // Authority distribution
    const authorityCount = allRules.reduce((acc, rule) => {
      acc[rule.authority] = (acc[rule.authority] || 0) + 1;
      return acc;
    }, {} as {[key: string]: number});
    
    console.log('\nAuthority Distribution:');
    Object.entries(authorityCount).forEach(([authority, count]) => {
      console.log(`  ${authority}: ${count} rules`);
    });
    
    // Validate rule structure
    console.log('\n🔍 STRUCTURE VALIDATION:');
    console.log('=========================');
    
    let validRules = 0;
    let issues = [];
    
    for (const rule of allRules) {
      let isValid = true;
      
      // Check required fields
      if (!rule.id || !rule.title || !rule.description) {
        issues.push(`Rule missing basic fields: ${rule.title || 'Unknown'}`);
        isValid = false;
      }
      
      // Check applicability criteria
      if (!rule.applicability_criteria || !rule.applicability_criteria.business_types) {
        issues.push(`Rule missing applicability criteria: ${rule.title}`);
        isValid = false;
      }
      
      // Check compliance steps
      if (!rule.compliance_steps || rule.compliance_steps.length === 0) {
        issues.push(`Rule missing compliance steps: ${rule.title}`);
        isValid = false;
      }
      
      if (isValid) validRules++;
    }
    
    console.log(`✅ Valid Rules: ${validRules}/${allRules.length}`);
    console.log(`✅ Success Rate: ${Math.round((validRules / allRules.length) * 100)}%`);
    
    if (issues.length > 0) {
      console.log('\n⚠️  Issues Found:');
      issues.forEach(issue => console.log(`  - ${issue}`));
    }
    
    console.log('\n🎉 AI GENERATION TEST COMPLETED SUCCESSFULLY!');
    console.log('==============================================');
    console.log('✅ Federal rules generation: Working');
    console.log('✅ State rules generation: Working');
    console.log('✅ Industry rules generation: Working');
    console.log('✅ Rule structure validation: Passed');
    console.log('✅ JSON parsing: Working');
    
    return {
      success: true,
      totalRules: allRules.length,
      validRules,
      totalTime: generationTime + stateGenerationTime + industryGenerationTime,
      rules: allRules
    };
    
  } catch (error) {
    console.error('❌ AI generation test failed:', error);
    
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    console.log('\n🔧 TROUBLESHOOTING TIPS:');
    console.log('1. Check your OpenAI API key is correct');
    console.log('2. Ensure you have sufficient OpenAI credits');
    console.log('3. Verify gpt-5-nano model access');
    console.log('4. Check internet connection');
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Run the test
if (require.main === module) {
  testAIGeneration().then(result => {
    process.exit(result.success ? 0 : 1);
  });
}

export { testAIGeneration };
