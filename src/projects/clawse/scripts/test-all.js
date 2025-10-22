#!/usr/bin/env node

/**
 * 🧪 Comprehensive Test Runner
 * Runs all tests with detailed reporting and error handling
 */

const { execSync } = require('child_process');
const fs = require('fs');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function printStatus(message) {
  console.log(`${colors.green}✅ ${message}${colors.reset}`);
}

function printError(message) {
  console.log(`${colors.red}❌ ${message}${colors.reset}`);
}

function printInfo(message) {
  console.log(`${colors.blue}ℹ️  ${message}${colors.reset}`);
}

function printHeader(message) {
  console.log(`${colors.cyan}🧪 ${message}${colors.reset}`);
  console.log('='.repeat(message.length + 3));
}

// Execute command and capture output
function execCommand(command, description) {
  const startTime = Date.now();
  
  try {
    console.log(`\n${colors.blue}🔄 ${description}...${colors.reset}`);
    const output = execSync(command, { 
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    const duration = Date.now() - startTime;
    printStatus(`${description} completed in ${duration}ms`);
    
    return {
      success: true,
      output,
      duration,
      error: null
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    printError(`${description} failed after ${duration}ms`);
    console.log(`${colors.red}Error: ${error.message}${colors.reset}`);
    
    return {
      success: false,
      output: error.stdout || '',
      duration,
      error: error.message
    };
  }
}

// Check environment setup
function checkEnvironment() {
  printInfo('Checking environment setup...');
  
  const checks = [];
  
  // Check .env file
  if (fs.existsSync('.env')) {
    const envContent = fs.readFileSync('.env', 'utf8');
    checks.push({
      name: '.env file exists',
      status: true
    });
    
    // Check for required variables
    const requiredVars = ['OPENAI_API_KEY', 'FIREBASE_PROJECT_ID', 'FIREBASE_PRIVATE_KEY', 'FIREBASE_CLIENT_EMAIL'];
    
    for (const varName of requiredVars) {
      const hasVar = envContent.includes(`${varName}=`) && !envContent.includes(`${varName}=your-`);
      checks.push({
        name: `${varName} configured`,
        status: hasVar
      });
    }
  } else {
    checks.push({
      name: '.env file exists',
      status: false
    });
  }
  
  // Check node_modules
  checks.push({
    name: 'Dependencies installed',
    status: fs.existsSync('node_modules')
  });
  
  // Check TypeScript files
  const tsFiles = ['src/config/firebase.ts', 'src/services/AIRuleGenerator.ts', 'src/services/FirestoreService.ts'];
  for (const file of tsFiles) {
    checks.push({
      name: `${file} exists`,
      status: fs.existsSync(file)
    });
  }
  
  console.log('\n📋 Environment Check Results:');
  console.log('==============================');
  
  let allPassed = true;
  for (const check of checks) {
    const status = check.status ? '✅' : '❌';
    console.log(`${status} ${check.name}`);
    if (!check.status) allPassed = false;
  }
  
  return { allPassed, checks };
}

// Run individual test and parse results
function runTest(testName, command, description) {
  const result = execCommand(command, description);
  
  // Parse test output for specific results
  let parsedResults = {};
  
  if (result.success && result.output) {
    // Extract key metrics from output
    const output = result.output;
    
    // Look for common patterns
    const rulesGenerated = output.match(/Generated (\d+) rules/i);
    const rulesStored = output.match(/Stored (\d+) rules/i);
    const matchingRules = output.match(/Found (\d+) matching rules/i);
    const tokensUsed = output.match(/(\d+) tokens/i);
    const cost = output.match(/\$([0-9.]+)/);
    
    if (rulesGenerated) parsedResults.rulesGenerated = parseInt(rulesGenerated[1]);
    if (rulesStored) parsedResults.rulesStored = parseInt(rulesStored[1]);
    if (matchingRules) parsedResults.matchingRules = parseInt(matchingRules[1]);
    if (tokensUsed) parsedResults.tokensUsed = parseInt(tokensUsed[1]);
    if (cost) parsedResults.estimatedCost = parseFloat(cost[1]);
  }
  
  return {
    testName,
    ...result,
    parsedResults
  };
}

// Main test runner
async function runAllTests() {
  printHeader('Compliance Platform Test Suite');
  console.log('');
  
  const startTime = Date.now();
  
  // Environment check
  const envCheck = checkEnvironment();
  if (!envCheck.allPassed) {
    printError('Environment check failed. Please fix the issues above before running tests.');
    return;
  }
  
  printStatus('Environment check passed');
  
  // Define test suite
  const tests = [
    {
      name: 'OpenAI Connection',
      command: 'npm run test:openai',
      description: 'Testing OpenAI API connection and gpt-5-nano access',
      critical: true
    },
    {
      name: 'Firebase Connection',
      command: 'npm run test:firebase',
      description: 'Testing Firebase/Firestore connection and operations',
      critical: true
    },
    {
      name: 'AI Rule Generation',
      command: 'npm run test:ai-generation',
      description: 'Testing AI-powered compliance rule generation',
      critical: false
    },
    {
      name: 'End-to-End Workflow',
      command: 'npm run test:end-to-end',
      description: 'Testing complete workflow with 10 rules',
      critical: false
    }
  ];
  
  const results = [];
  let criticalFailures = 0;
  let totalFailures = 0;
  
  // Run each test
  for (const test of tests) {
    const result = runTest(test.name, test.command, test.description);
    results.push({
      ...result,
      critical: test.critical
    });
    
    if (!result.success) {
      totalFailures++;
      if (test.critical) {
        criticalFailures++;
      }
    }
    
    // Add delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  const totalTime = Date.now() - startTime;
  
  // Generate comprehensive report
  console.log('\n');
  printHeader('Test Results Summary');
  console.log('');
  
  // Overall status
  const overallStatus = criticalFailures === 0 ? 'PASSED' : 'FAILED';
  const statusColor = criticalFailures === 0 ? colors.green : colors.red;
  console.log(`${statusColor}Overall Status: ${overallStatus}${colors.reset}`);
  console.log(`Total Time: ${totalTime}ms`);
  console.log(`Tests Run: ${tests.length}`);
  console.log(`Passed: ${tests.length - totalFailures}`);
  console.log(`Failed: ${totalFailures}`);
  console.log(`Critical Failures: ${criticalFailures}`);
  console.log('');
  
  // Detailed results
  console.log('📊 Detailed Results:');
  console.log('====================');
  
  for (const result of results) {
    const status = result.success ? '✅' : '❌';
    const critical = result.critical ? ' (CRITICAL)' : '';
    console.log(`${status} ${result.testName}${critical} - ${result.duration}ms`);
    
    // Show parsed results if available
    if (result.parsedResults && Object.keys(result.parsedResults).length > 0) {
      Object.entries(result.parsedResults).forEach(([key, value]) => {
        console.log(`   ${key}: ${value}`);
      });
    }
    
    // Show error if failed
    if (!result.success && result.error) {
      console.log(`   Error: ${result.error.substring(0, 100)}...`);
    }
  }
  
  // Performance metrics
  console.log('\n⚡ Performance Metrics:');
  console.log('=======================');
  
  const totalRulesGenerated = results.reduce((sum, r) => sum + (r.parsedResults?.rulesGenerated || 0), 0);
  const totalTokensUsed = results.reduce((sum, r) => sum + (r.parsedResults?.tokensUsed || 0), 0);
  const totalCost = results.reduce((sum, r) => sum + (r.parsedResults?.estimatedCost || 0), 0);
  
  if (totalRulesGenerated > 0) console.log(`Total Rules Generated: ${totalRulesGenerated}`);
  if (totalTokensUsed > 0) console.log(`Total Tokens Used: ${totalTokensUsed}`);
  if (totalCost > 0) console.log(`Estimated Total Cost: $${totalCost.toFixed(4)}`);
  
  // Recommendations
  console.log('\n💡 Recommendations:');
  console.log('===================');
  
  if (criticalFailures > 0) {
    console.log('❌ Critical tests failed. Please fix these issues before proceeding:');
    results.filter(r => !r.success && r.critical).forEach(r => {
      console.log(`   - ${r.testName}: ${r.error}`);
    });
  } else if (totalFailures > 0) {
    console.log('⚠️  Some non-critical tests failed. The platform should still work:');
    results.filter(r => !r.success && !r.critical).forEach(r => {
      console.log(`   - ${r.testName}: ${r.error}`);
    });
  } else {
    console.log('✅ All tests passed! Your platform is ready for:');
    console.log('   1. Scaling to 100+ rules');
    console.log('   2. Building React frontend');
    console.log('   3. Adding PDF generation');
    console.log('   4. Implementing email delivery');
  }
  
  // Save results to file
  const reportData = {
    timestamp: new Date().toISOString(),
    overallStatus,
    totalTime,
    criticalFailures,
    totalFailures,
    results: results.map(r => ({
      testName: r.testName,
      success: r.success,
      duration: r.duration,
      critical: r.critical,
      parsedResults: r.parsedResults,
      error: r.error
    })),
    metrics: {
      totalRulesGenerated,
      totalTokensUsed,
      totalCost
    }
  };
  
  fs.writeFileSync('test-results.json', JSON.stringify(reportData, null, 2));
  console.log('\n📄 Detailed results saved to test-results.json');
  
  return criticalFailures === 0;
}

// Run if called directly
if (require.main === module) {
  runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = { runAllTests };
