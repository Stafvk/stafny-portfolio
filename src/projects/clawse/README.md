# 🏢 Business Compliance Platform

A comprehensive AI-powered platform that helps US businesses understand and comply with federal, state, and local regulations using OpenAI gpt-5-nano and Firebase/Firestore.

## 🚀 Features

- **AI-Powered Rule Generation**: Uses OpenAI gpt-5-nano to generate comprehensive compliance rules
- **Multi-Level Coverage**: Federal, state, and local compliance requirements
- **Smart Business Matching**: Matches rules to specific business profiles
- **Real-time Processing**: Hybrid approach with bulk collection and real-time processing
- **Deduplication**: Prevents duplicate rules across multiple sources
- **Source Tracking**: Maintains links to original regulatory sources

## 🏗️ Architecture

```
Federal APIs → Data Processor → AI Structurer → Database → User Queries
     ↓              ↓              ↓            ↓           ↓
Regulations.gov   Clean &        OpenAI       Firestore    <500ms
SBA API          Normalize      Structure    + Firebase   Response
Data.gov APIs   Transform      Rules        Admin SDK
```

## 📋 Tech Stack

- **Backend**: Node.js + TypeScript
- **Database**: Firebase Firestore
- **AI**: OpenAI gpt-5-nano
- **APIs**: Regulations.gov, SBA API, Data.gov
- **Authentication**: Firebase Auth
- **Hosting**: Firebase Hosting

## 🔧 Setup Instructions

### 1. Prerequisites

- Node.js 18+ installed
- Firebase account
- OpenAI API account with gpt-5-nano access

### 2. Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd compliance-platform

# Install dependencies
npm install

# Install TypeScript globally (if not already installed)
npm install -g typescript ts-node
```

### 3. Environment Configuration

Create a `.env` file in the root directory:

```bash
# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com

# OpenAI Configuration  
OPENAI_API_KEY=your-openai-api-key

# API Keys for Data Collection
REGULATIONS_API_KEY=your-regulations-gov-key
SBA_API_KEY=your-sba-api-key

# Environment
NODE_ENV=development
```

### 4. Firebase Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com)
2. Enable Firestore Database
3. Generate a service account key:
   - Go to Project Settings → Service Accounts
   - Click "Generate new private key"
   - Save as `serviceAccountKey.json` (optional, using env vars is preferred)
4. Update your `.env` file with the credentials

### 5. OpenAI Setup

1. Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Ensure you have gpt-5-nano access and sufficient credits
3. Add the key to your `.env` file

## 🧪 Testing

Run the test suite to verify everything is working:

```bash
# Test Firebase connection
npm run test:firebase

# Test OpenAI connection
npm run test:openai

# Test AI rule generation
npm run test:ai-generation

# Run complete end-to-end test
npm run test:end-to-end
```

### Expected Test Results

✅ **Firebase Test**: Connection, read/write operations, batch operations
✅ **OpenAI Test**: API connection, JSON generation, compliance rule creation
✅ **AI Generation Test**: Federal, state, and industry-specific rule generation
✅ **End-to-End Test**: Complete workflow with 10 rules generated and stored

## 📊 Usage Examples

### Generate Federal Compliance Rules

```typescript
import { AIRuleGenerator } from './src/services/AIRuleGenerator';

const generator = new AIRuleGenerator(process.env.OPENAI_API_KEY!);
const rules = await generator.generateFederalRules(10);
console.log(`Generated ${rules.length} federal compliance rules`);
```

### Store Rules in Firestore

```typescript
import { FirestoreService } from './src/services/FirestoreService';

const firestoreService = new FirestoreService();
await firestoreService.storeRules(rules);
console.log('Rules stored successfully');
```

### Match Rules to Business Profile

```typescript
const businessProfile = {
  business_type: 'LLC',
  headquarters_state: 'CA',
  employee_count: 15,
  annual_revenue: 500000,
  primary_industry: '541511', // Software development
  // ... other profile fields
};

const matchingRules = await firestoreService.getMatchingRules(businessProfile);
console.log(`Found ${matchingRules.length} applicable rules`);
```

## 🗂️ Project Structure

```
compliance-platform/
├── src/
│   ├── config/
│   │   └── firebase.ts          # Firebase configuration
│   ├── services/
│   │   ├── AIRuleGenerator.ts   # OpenAI rule generation
│   │   └── FirestoreService.ts  # Database operations
│   ├── types/
│   │   └── ComplianceRule.ts    # TypeScript interfaces
│   ├── test-firebase.ts         # Firebase connection test
│   ├── test-openai.ts          # OpenAI connection test
│   ├── test-ai-generation.ts   # AI generation test
│   └── test-end-to-end.ts      # Complete workflow test
├── .env                        # Environment variables
├── .gitignore                  # Git ignore rules
├── package.json                # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
└── README.md                  # This file
```

## 🎯 Next Steps

After successful testing, you can:

1. **Scale Up**: Generate 100+ rules for comprehensive coverage
2. **Add Real-time Processing**: Implement the hybrid approach for user queries
3. **Build Frontend**: Create React interface for business owners
4. **Add PDF Generation**: Generate professional compliance reports
5. **Implement Email Delivery**: Send reports via email
6. **Add More Data Sources**: Integrate additional regulatory APIs

## 💰 Cost Estimates

### One-time Setup
- **OpenAI API**: ~$50-100 (processing 2000 rules with gpt-5-nano)
- **Firebase**: Free tier sufficient for development

### Ongoing Costs
- **OpenAI**: ~$5-10/month for updates and new queries
- **Firebase**: ~$5-15/month for storage and operations
- **Total**: ~$10-25/month for moderate usage

## 🔍 Troubleshooting

### Common Issues

1. **Firebase Connection Failed**
   - Check your `.env` file has correct credentials
   - Ensure FIREBASE_PRIVATE_KEY has proper newline escaping
   - Verify Firestore is enabled in Firebase Console

2. **OpenAI API Errors**
   - Verify your API key is correct
   - Check you have sufficient credits
   - Ensure gpt-5-nano model access

3. **Rule Generation Issues**
   - Check internet connection
   - Verify OpenAI API limits
   - Try reducing batch size if timeouts occur

### Getting Help

- Check the test outputs for specific error messages
- Review Firebase Console for database issues
- Monitor OpenAI usage dashboard for API issues

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run the test suite
5. Submit a pull request

---

**Ready to get started?** Run `npm run test:end-to-end` to verify your setup! 🚀
