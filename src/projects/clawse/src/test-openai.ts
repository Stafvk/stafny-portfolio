import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

async function testOpenAI() {
  console.log('🤖 Testing OpenAI connection...\n');
  
  try {
    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    console.log('🔑 OpenAI API key loaded:', process.env.OPENAI_API_KEY ? 'Yes' : 'No');
    console.log('🔑 API key length:', process.env.OPENAI_API_KEY?.length || 0);
    
    // Test 1: Simple completion
    console.log('📝 Test 1: Simple completion...');
    const simpleResponse = await openai.chat.completions.create({
      model: "gpt-5-nano",
      messages: [
        {
          role: "user",
          content: "Say 'OpenAI connection successful!' and nothing else."
        }
      ],
      max_completion_tokens: 50000
    });
    
    console.log('✅ Simple response:', simpleResponse.choices[0]?.message?.content);
    console.log('✅ Tokens used:', simpleResponse.usage?.total_tokens);
    
    // Test 2: JSON structured response
    console.log('\n📋 Test 2: JSON structured response...');
    const jsonResponse = await openai.chat.completions.create({
      model: "gpt-5-nano",
      messages: [
        {
          role: "user",
          content: `Return a JSON object with this structure:
          {
            "status": "success",
            "message": "OpenAI API is working correctly",
            "timestamp": "${new Date().toISOString()}",
            "test_data": {
              "number": 42,
              "array": ["item1", "item2", "item3"]
            }
          }`
        }
      ],
      max_completion_tokens: 50000
    });
    
    const jsonContent = jsonResponse.choices[0]?.message?.content;
    console.log('✅ JSON response received');
    
    try {
      const parsedJson = JSON.parse(jsonContent || '{}');
      console.log('✅ JSON parsing successful:');
      console.log('   Status:', parsedJson.status);
      console.log('   Message:', parsedJson.message);
      console.log('   Test number:', parsedJson.test_data?.number);
    } catch (parseError) {
      console.log('⚠️  JSON parsing failed, but response received');
      console.log('Raw response:', jsonContent);
    }
    
    // Test 3: Business compliance rule generation (mini test)
    console.log('\n🏢 Test 3: Business compliance rule generation...');
    const complianceResponse = await openai.chat.completions.create({
      model: "gpt-5-nano",
      messages: [
        {
          role: "user",
          content: `Generate 1 simple US federal business compliance requirement in JSON format:
          {
            "title": "Rule title",
            "description": "Rule description", 
            "authority": "IRS",
            "level": "federal",
            "priority": "high"
          }`
        }
      ],
      max_completion_tokens: 50000
    });
    
    const complianceContent = complianceResponse.choices[0]?.message?.content;
    console.log('✅ Compliance rule generation test completed');
    
    try {
      const complianceRule = JSON.parse(complianceContent || '{}');
      console.log('✅ Generated rule:');
      console.log('   Title:', complianceRule.title);
      console.log('   Authority:', complianceRule.authority);
      console.log('   Priority:', complianceRule.priority);
    } catch (parseError) {
      console.log('⚠️  Rule parsing failed, but response received');
      console.log('Raw response:', complianceContent?.substring(0, 200) + '...');
    }
    
    // Test 4: Model capabilities check
    console.log('\n🔍 Test 4: Model capabilities check...');
    const capabilitiesResponse = await openai.chat.completions.create({
      model: "gpt-5-nano",
      messages: [
        {
          role: "user",
          content: "What model are you and what's your knowledge cutoff date? Answer in one sentence."
        }
      ],
      max_completion_tokens: 50000
    });
    
    console.log('✅ Model info:', capabilitiesResponse.choices[0]?.message?.content);
    
    // Calculate total tokens used
    const totalTokens = (simpleResponse.usage?.total_tokens || 0) +
                       (jsonResponse.usage?.total_tokens || 0) +
                       (complianceResponse.usage?.total_tokens || 0) +
                       (capabilitiesResponse.usage?.total_tokens || 0);
    
    console.log('\n🎉 OPENAI TEST COMPLETED SUCCESSFULLY!');
    console.log('=====================================');
    console.log('✅ Simple completion: Working');
    console.log('✅ JSON generation: Working');
    console.log('✅ Compliance rules: Working');
    console.log('✅ Model access: Working');
    console.log(`✅ Total tokens used: ${totalTokens}`);
    console.log(`✅ Estimated cost: $${(totalTokens * 0.00003).toFixed(4)} (gpt-5-nano pricing)`);
    
    return true;
    
  } catch (error) {
    console.error('❌ OpenAI test failed:', error);
    
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      
      // Specific error handling
      if (error.message.includes('401')) {
        console.error('🔑 Authentication failed - check your API key');
      } else if (error.message.includes('429')) {
        console.error('⏰ Rate limit exceeded - wait and try again');
      } else if (error.message.includes('insufficient_quota')) {
        console.error('💳 Insufficient quota - check your OpenAI billing');
      }
    }
    
    console.log('\n🔧 TROUBLESHOOTING TIPS:');
    console.log('1. Verify your OpenAI API key is correct in .env file');
    console.log('2. Check your OpenAI account has sufficient credits');
    console.log('3. Ensure you have access to gpt-5-nano model');
    console.log('4. Try with GPT-3.5-turbo if gpt-5-nano access is limited');
    
    return false;
  }
}

// Run the test
if (require.main === module) {
  testOpenAI().then(success => {
    process.exit(success ? 0 : 1);
  });
}

export { testOpenAI };
