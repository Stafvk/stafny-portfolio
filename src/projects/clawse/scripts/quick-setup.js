#!/usr/bin/env node

/**
 * 🚀 Quick Setup Script for Compliance Platform
 * This Node.js script automates the setup without requiring gcloud CLI
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

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

function printWarning(message) {
  console.log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
}

function printError(message) {
  console.log(`${colors.red}❌ ${message}${colors.reset}`);
}

function printInfo(message) {
  console.log(`${colors.blue}ℹ️  ${message}${colors.reset}`);
}

function printHeader(message) {
  console.log(`${colors.cyan}🚀 ${message}${colors.reset}`);
  console.log('='.repeat(message.length + 3));
}

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(`${colors.blue}❓ ${question}${colors.reset}`, (answer) => {
      resolve(answer.trim());
    });
  });
}

// Execute command and return output
function execCommand(command, options = {}) {
  try {
    const result = execSync(command, { 
      encoding: 'utf8', 
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options 
    });
    return result;
  } catch (error) {
    if (!options.silent) {
      printError(`Command failed: ${command}`);
      printError(error.message);
    }
    throw error;
  }
}

// Check if command exists
function commandExists(command) {
  try {
    execCommand(`which ${command}`, { silent: true });
    return true;
  } catch {
    return false;
  }
}

// Check Node.js version
function checkNode() {
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  
  if (majorVersion < 18) {
    printError(`Node.js version 18+ required. Current version: ${nodeVersion}`);
    process.exit(1);
  }
  
  printStatus(`Node.js ${nodeVersion} is installed`);
}

// Install dependencies
function installDependencies() {
  printInfo('Installing project dependencies...');
  execCommand('npm install');
  printStatus('Dependencies installed successfully');
}

// Install Firebase CLI
function installFirebaseCLI() {
  printInfo('Checking Firebase CLI...');
  
  if (commandExists('firebase')) {
    printStatus('Firebase CLI already installed');
    return;
  }
  
  printInfo('Installing Firebase CLI globally...');
  execCommand('npm install -g firebase-tools');
  printStatus('Firebase CLI installed');
}

// Firebase login
async function firebaseLogin() {
  printInfo('Checking Firebase authentication...');
  
  try {
    execCommand('firebase projects:list', { silent: true });
    printStatus('Already logged into Firebase');
    return;
  } catch {
    printWarning('Please login to Firebase in the browser window that opens...');
    execCommand('firebase login');
    printStatus('Firebase login completed');
  }
}

// Get or create Firebase project
async function setupFirebaseProject() {
  printInfo('Setting up Firebase project...');
  
  // Check if project already exists
  if (fs.existsSync('.firebase-project-id')) {
    const existingProjectId = fs.readFileSync('.firebase-project-id', 'utf8').trim();
    const useExisting = await askQuestion(`Use existing project ${existingProjectId}? (y/n): `);
    
    if (useExisting.toLowerCase() === 'y') {
      execCommand(`firebase use ${existingProjectId}`);
      printStatus(`Using existing project: ${existingProjectId}`);
      return existingProjectId;
    }
  }
  
  // Create new project
  const projectName = await askQuestion('Enter project name (or press Enter for auto-generated): ');
  const projectId = projectName || `compliance-platform-${Date.now()}`;
  
  try {
    printInfo(`Creating Firebase project: ${projectId}`);
    execCommand(`firebase projects:create ${projectId} --display-name "Compliance Platform"`);
    execCommand(`firebase use ${projectId}`);
    
    // Save project ID
    fs.writeFileSync('.firebase-project-id', projectId);
    
    printStatus(`Firebase project created: ${projectId}`);
    return projectId;
  } catch (error) {
    printError('Failed to create Firebase project automatically');
    printInfo('Please create a project manually at https://console.firebase.google.com');
    
    const manualProjectId = await askQuestion('Enter your Firebase project ID: ');
    execCommand(`firebase use ${manualProjectId}`);
    fs.writeFileSync('.firebase-project-id', manualProjectId);
    
    return manualProjectId;
  }
}

// Initialize Firestore
function initializeFirestore() {
  printInfo('Initializing Firestore...');
  
  // Create firestore.rules
  const firestoreRules = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access for development
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`;
  
  fs.writeFileSync('firestore.rules', firestoreRules);
  
  // Create firestore.indexes.json
  const firestoreIndexes = {
    indexes: [
      {
        collectionGroup: "compliance_rules",
        queryScope: "COLLECTION",
        fields: [
          { fieldPath: "applicability_criteria.business_types", arrayConfig: "CONTAINS" },
          { fieldPath: "applicability_criteria.states", arrayConfig: "CONTAINS" },
          { fieldPath: "status", order: "ASCENDING" },
          { fieldPath: "priority", order: "ASCENDING" }
        ]
      },
      {
        collectionGroup: "compliance_rules",
        queryScope: "COLLECTION",
        fields: [
          { fieldPath: "applicability_criteria.industries", arrayConfig: "CONTAINS" },
          { fieldPath: "status", order: "ASCENDING" },
          { fieldPath: "priority", order: "ASCENDING" }
        ]
      }
    ],
    fieldOverrides: []
  };
  
  fs.writeFileSync('firestore.indexes.json', JSON.stringify(firestoreIndexes, null, 2));
  
  // Create firebase.json
  const firebaseConfig = {
    firestore: {
      rules: "firestore.rules",
      indexes: "firestore.indexes.json"
    }
  };
  
  fs.writeFileSync('firebase.json', JSON.stringify(firebaseConfig, null, 2));
  
  printStatus('Firestore configuration created');
}

// Manual Firebase setup instructions
async function manualFirebaseSetup() {
  printWarning('Manual Firebase setup required');
  console.log('\n📋 Please follow these steps:');
  console.log('1. Go to https://console.firebase.google.com');
  console.log('2. Select your project or create a new one');
  console.log('3. Enable Firestore Database (Start in test mode)');
  console.log('4. Go to Project Settings → Service Accounts');
  console.log('5. Click "Generate new private key"');
  console.log('6. Download the JSON file');
  console.log('');
  
  const projectId = await askQuestion('Enter your Firebase Project ID: ');
  const privateKey = await askQuestion('Enter your Private Key (the long string starting with -----BEGIN): ');
  const clientEmail = await askQuestion('Enter your Client Email (ends with @your-project.iam.gserviceaccount.com): ');
  
  // Update .env file
  let envContent = fs.readFileSync('.env', 'utf8');
  envContent = envContent.replace(/FIREBASE_PROJECT_ID=.*/, `FIREBASE_PROJECT_ID=${projectId}`);
  envContent = envContent.replace(/FIREBASE_PRIVATE_KEY=.*/, `FIREBASE_PRIVATE_KEY="${privateKey}"`);
  envContent = envContent.replace(/FIREBASE_CLIENT_EMAIL=.*/, `FIREBASE_CLIENT_EMAIL=${clientEmail}`);
  
  fs.writeFileSync('.env', envContent);
  
  printStatus('Firebase credentials updated in .env file');
  return projectId;
}

// Run tests
async function runTests() {
  printInfo('Running test suite...');
  
  const tests = [
    { name: 'OpenAI connection', command: 'npm run test:openai' },
    { name: 'Firebase connection', command: 'npm run test:firebase' },
    { name: 'AI rule generation', command: 'npm run test:ai-generation' },
    { name: 'End-to-end workflow', command: 'npm run test:end-to-end' }
  ];
  
  for (const test of tests) {
    try {
      printInfo(`Testing ${test.name}...`);
      execCommand(test.command);
      printStatus(`${test.name} test passed`);
    } catch (error) {
      printError(`${test.name} test failed`);
      const continueAnyway = await askQuestion('Continue with remaining tests? (y/n): ');
      if (continueAnyway.toLowerCase() !== 'y') {
        throw error;
      }
    }
  }
  
  printStatus('Test suite completed!');
}

// Main setup function
async function main() {
  try {
    printHeader('Compliance Platform Quick Setup');
    console.log('');
    
    // Check prerequisites
    checkNode();
    
    // Install dependencies
    installDependencies();
    
    // Firebase setup
    installFirebaseCLI();
    await firebaseLogin();
    
    // Try automatic setup first, fall back to manual
    let projectId;
    try {
      projectId = await setupFirebaseProject();
      initializeFirestore();
      
      // Deploy Firestore rules
      try {
        execCommand('firebase deploy --only firestore:rules,firestore:indexes');
        printStatus('Firestore rules and indexes deployed');
      } catch (error) {
        printWarning('Failed to deploy Firestore rules automatically');
        printInfo('You can deploy them later with: firebase deploy --only firestore');
      }
    } catch (error) {
      projectId = await manualFirebaseSetup();
    }
    
    // Run tests
    await runTests();
    
    // Success message
    console.log('');
    printStatus('🎉 SETUP COMPLETED SUCCESSFULLY!');
    console.log('');
    printInfo('Your compliance platform is ready to use!');
    printInfo(`Project ID: ${projectId}`);
    printInfo('');
    printInfo('Next steps:');
    printInfo('  1. Run "npm run test:end-to-end" to verify everything works');
    printInfo('  2. Start building your React frontend');
    printInfo('  3. Scale up to 100+ rules for production');
    console.log('');
    
  } catch (error) {
    printError('Setup failed');
    console.error(error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n\nSetup interrupted by user');
  rl.close();
  process.exit(1);
});

// Run the setup
if (require.main === module) {
  main();
}

module.exports = { main };
