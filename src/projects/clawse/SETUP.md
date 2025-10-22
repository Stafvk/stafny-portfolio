# 🚀 One-Command Setup Guide

This guide provides **automated CLI setup** for the entire Compliance Platform. Everything can be configured through command line!

## 🎯 **Quick Start (Recommended)**

### **Option 1: Fully Automated Setup**
```bash
# Install dependencies and run automated setup
npm install
npm run setup
```

This interactive script will:
- ✅ Check Node.js and npm versions
- ✅ Install all dependencies
- ✅ Install Firebase CLI globally
- ✅ Login to Firebase (opens browser)
- ✅ Create Firebase project automatically
- ✅ Enable Firestore with proper rules and indexes
- ✅ Update .env file with credentials
- ✅ Run complete test suite
- ✅ Verify everything works end-to-end

### **Option 2: Advanced Setup (with Google Cloud CLI)**
```bash
# For users with gcloud CLI installed
npm install
npm run setup:full
```

### **Option 3: Test Existing Setup**
```bash
# If you already have everything configured
npm run test:all
```

## 📋 **What the Setup Scripts Do**

### **Automated Firebase Project Creation**
The setup script will:
1. Create a unique Firebase project ID: `compliance-platform-[timestamp]`
2. Enable Firestore Database in test mode
3. Deploy Firestore security rules and composite indexes
4. Generate service account credentials
5. Update your `.env` file automatically

### **Environment Configuration**
Your `.env` file will be automatically updated with:
```bash
FIREBASE_PROJECT_ID=compliance-platform-1703123456
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n[auto-generated]\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@compliance-platform-1703123456.iam.gserviceaccount.com
OPENAI_API_KEY=sk-proj-[your-existing-key]
```

### **Firestore Setup**
Automatically creates:
- **Security Rules**: Development-friendly rules (restrict in production)
- **Composite Indexes**: Optimized for business profile matching
- **Collections**: Ready for compliance_rules, business_profiles, rule_deduplication

## 🧪 **Comprehensive Testing**

The setup includes a full test suite:

```bash
npm run test:all
```

**Test Coverage:**
- ✅ **Environment Check**: Verifies all files and configurations
- ✅ **OpenAI Connection**: Tests gpt-5-nano access and rule generation
- ✅ **Firebase Connection**: Tests Firestore read/write operations
- ✅ **AI Rule Generation**: Generates federal, state, and industry rules
- ✅ **End-to-End Workflow**: Complete 10-rule generation and storage
- ✅ **Performance Metrics**: Tracks timing, costs, and success rates

**Expected Output:**
```
🧪 Compliance Platform Test Suite
=================================

✅ Environment check passed
✅ OpenAI Connection completed in 1234ms
✅ Firebase Connection completed in 567ms
✅ AI Rule Generation completed in 15678ms
✅ End-to-End Workflow completed in 18901ms

📊 Detailed Results:
====================
✅ OpenAI Connection - 1234ms
   tokensUsed: 45
   estimatedCost: 0.0012
✅ Firebase Connection - 567ms
✅ AI Rule Generation - 15678ms
   rulesGenerated: 7
✅ End-to-End Workflow - 18901ms
   rulesGenerated: 10
   rulesStored: 10
   matchingRules: 8

Overall Status: PASSED
```

## 🔧 **Manual Setup (Fallback)**

If automated setup fails, the script will guide you through manual steps:

### **1. Create Firebase Project Manually**
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Create a project"
3. Name: "compliance-platform"
4. Enable Firestore Database (test mode)

### **2. Get Service Account Key**
1. Project Settings → Service Accounts
2. Click "Generate new private key"
3. Download the JSON file

### **3. Update .env File**
```bash
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
```

## 🎯 **Verification Commands**

After setup, verify everything works:

```bash
# Test individual components
npm run test:openai        # Should show "OpenAI connection successful!"
npm run test:firebase      # Should show "Firebase connected!"
npm run test:ai-generation # Should generate 7 sample rules
npm run test:end-to-end    # Should complete full workflow

# Run comprehensive test suite
npm run test:all           # Runs all tests with detailed reporting
```

## 🚨 **Troubleshooting**

### **Common Issues & Solutions**

**1. Firebase Login Issues**
```bash
# Clear Firebase cache and re-login
firebase logout
firebase login
```

**2. Permission Errors**
```bash
# Install Firebase CLI with proper permissions
sudo npm install -g firebase-tools
```

**3. OpenAI API Errors**
- Check your API key is correct in `.env`
- Verify you have gpt-5-nano access
- Ensure sufficient credits in OpenAI account

**4. Node.js Version Issues**
```bash
# Check Node.js version (18+ required)
node --version

# Update Node.js if needed
nvm install 18
nvm use 18
```

### **Getting Help**

If setup fails:
1. Check the error messages in terminal
2. Run `npm run test:all` for detailed diagnostics
3. Review `test-results.json` for specific failure details
4. Check Firebase Console for project status
5. Verify OpenAI dashboard for API usage

## 🎉 **Success Indicators**

You'll know setup is successful when:
- ✅ All tests pass in `npm run test:all`
- ✅ Firebase project visible in console
- ✅ Firestore collections created
- ✅ 10 sample rules generated and stored
- ✅ Business profile matching works
- ✅ No critical errors in test output

## 🚀 **Next Steps After Setup**

Once setup is complete:

1. **Scale Up**: Generate 100+ rules for production
   ```bash
   # Modify test files to generate more rules
   npm run test:ai-generation
   ```

2. **Build Frontend**: Create React interface
   ```bash
   npx create-react-app frontend --template typescript
   ```

3. **Add Real-time Processing**: Implement hybrid approach
4. **PDF Generation**: Add report generation
5. **Email Delivery**: Implement email notifications

---

**Ready to start?** Just run:
```bash
npm install && npm run setup
```

The entire setup takes **5-10 minutes** and handles everything automatically! 🚀
