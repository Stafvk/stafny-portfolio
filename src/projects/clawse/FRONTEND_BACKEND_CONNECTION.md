# 🔗 Frontend-Backend Connection Guide

## 🚀 Quick Start

### 1. Make the startup script executable:
```bash
chmod +x start-servers.sh
```

### 2. Start both servers:
```bash
./start-servers.sh
```

This will:
- Install backend dependencies
- Start the Express API server on `http://localhost:3001`
- Start the React frontend on `http://localhost:5173`

### 3. Test the connection:
1. Open `http://localhost:5173` in your browser
2. Fill out the business form
3. Click "Check Compliance Requirements"
4. See real data from your Firebase database + AI-generated report!

## 🔧 Manual Setup (Alternative)

### Backend Server:
```bash
# Install dependencies
cp backend-package.json package.json
npm install

# Start server
node server.js
```

### Frontend Server:
```bash
cd frontend
npm run dev
```

## 📊 What's Connected:

### ✅ **Real Firebase Data**
- Uses your existing 30+ compliance rules from Firestore
- Stores business profiles in Firebase
- Real-time rule matching based on business criteria

### ✅ **AI-Powered Reports**
- Generates professional compliance reports using OpenAI
- Customized based on your specific business details
- Formatted with headings, bullet points, and action items

### ✅ **Smart Matching**
- Matches rules based on:
  - Business type (LLC, Corp, etc.)
  - State location
  - Employee count
  - Industry
  - Special conditions (handles data, has employees, etc.)

## 🎯 API Endpoints:

- `GET /api/health` - Health check
- `POST /api/compliance/analyze` - Main analysis endpoint
- `GET /api/compliance-rules` - Get all rules
- `POST /api/business-profiles` - Store business profile

## 🔍 How It Works:

1. **User fills form** → Frontend collects business data
2. **API call** → Frontend sends data to backend
3. **Firebase query** → Backend finds matching rules from your database
4. **AI generation** → Backend generates personalized report
5. **Display results** → Frontend shows rules + AI report

## 🛠️ Environment Variables Needed:

Make sure your `.env` file has:
```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email
OPENAI_API_KEY=your-openai-key
```

## 🎉 Features:

- **Single-screen interface** (matches job requirements)
- **Real-time analysis** using your actual rule database
- **Professional AI reports** with formatting and action items
- **Responsive design** works on mobile and desktop
- **Error handling** with fallback to mock data if API fails

## 🔧 Troubleshooting:

### Backend won't start:
- Check your `.env` file has all required variables
- Make sure Firebase credentials are correct
- Verify OpenAI API key is valid

### Frontend can't connect:
- Make sure backend is running on port 3001
- Check browser console for CORS errors
- Verify API calls are going to correct URL

### No rules found:
- Check if your Firebase has rules in `compliance_rules` collection
- Verify rules have proper `applicability_criteria` structure
- Check business profile data mapping

## 📈 Next Steps:

1. **Test with different business profiles** to see various rules
2. **Add more rules** to your Firebase database
3. **Customize AI prompts** for better reports
4. **Add PDF export** functionality
5. **Implement user authentication**
