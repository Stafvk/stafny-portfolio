#!/usr/bin/env node

const https = require('https');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🚀 Render Deployment Setup');
console.log('');
console.log('To deploy to Render, you need to:');
console.log('1. Create a Render account at https://render.com');
console.log('2. Get your API key from https://dashboard.render.com/account');
console.log('3. Connect your GitHub repository');
console.log('');

rl.question('Do you have a Render account and API key? (y/n): ', (answer) => {
  if (answer.toLowerCase() === 'y') {
    rl.question('Enter your Render API key: ', (apiKey) => {
      createService(apiKey);
    });
  } else {
    console.log('');
    console.log('Please:');
    console.log('1. Go to https://render.com and create an account');
    console.log('2. Go to https://dashboard.render.com/account to get your API key');
    console.log('3. Run this script again');
    rl.close();
  }
});

function createService(apiKey) {
  const serviceData = {
    type: 'web_service',
    name: 'clawse-business-compliance',
    repo: 'https://github.com/Stafvk/clawse',
    branch: 'main',
    buildCommand: 'npm install',
    startCommand: 'node server.js',
    plan: 'free',
    region: 'oregon',
    envVars: [
      { key: 'NODE_ENV', value: 'production' },
      { key: 'PORT', value: '10000' }
    ]
  };

  const postData = JSON.stringify(serviceData);

  const options = {
    hostname: 'api.render.com',
    port: 443,
    path: '/v1/services',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = https.request(options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      if (res.statusCode === 201) {
        const service = JSON.parse(data);
        console.log('✅ Service created successfully!');
        console.log(`🌐 Service URL: ${service.serviceDetails.url}`);
        console.log(`📊 Dashboard: https://dashboard.render.com/web/${service.id}`);
        console.log('');
        console.log('Now you need to set environment variables in the Render dashboard:');
        console.log('- FIREBASE_PROJECT_ID');
        console.log('- FIREBASE_PRIVATE_KEY');
        console.log('- FIREBASE_CLIENT_EMAIL');
        console.log('- OPENAI_API_KEY');
        console.log('- REGULATIONS_API_KEY');
      } else {
        console.error('❌ Failed to create service:', res.statusCode);
        console.error(data);
      }
      rl.close();
    });
  });

  req.on('error', (e) => {
    console.error('❌ Request error:', e.message);
    rl.close();
  });

  req.write(postData);
  req.end();
}
