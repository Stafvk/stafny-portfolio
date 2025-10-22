#!/bin/bash

# 🚀 Compliance Platform Setup Script
# This script automates the entire setup process

set -e  # Exit on any error

echo "🚀 Starting Compliance Platform Setup..."
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if Node.js is installed
check_node() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ first."
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18+ required. Current version: $(node --version)"
        exit 1
    fi
    
    print_status "Node.js $(node --version) is installed"
}

# Check if npm is installed
check_npm() {
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    print_status "npm $(npm --version) is installed"
}

# Install dependencies
install_dependencies() {
    print_info "Installing project dependencies..."
    npm install
    print_status "Dependencies installed successfully"
}

# Install Firebase CLI globally
install_firebase_cli() {
    print_info "Installing Firebase CLI..."
    if ! command -v firebase &> /dev/null; then
        npm install -g firebase-tools
        print_status "Firebase CLI installed"
    else
        print_status "Firebase CLI already installed ($(firebase --version))"
    fi
}

# Login to Firebase
firebase_login() {
    print_info "Logging into Firebase..."
    if firebase projects:list &> /dev/null; then
        print_status "Already logged into Firebase"
    else
        print_warning "Please login to Firebase in the browser window that opens..."
        firebase login
        print_status "Firebase login completed"
    fi
}

# Create Firebase project
create_firebase_project() {
    print_info "Setting up Firebase project..."
    
    # Generate a unique project ID
    PROJECT_ID="compliance-platform-$(date +%s)"
    
    print_info "Creating Firebase project: $PROJECT_ID"
    
    # Create the project
    firebase projects:create "$PROJECT_ID" --display-name "Compliance Platform"
    
    # Set the project as default
    firebase use "$PROJECT_ID"
    
    print_status "Firebase project created: $PROJECT_ID"
    echo "$PROJECT_ID" > .firebase-project-id
}

# Initialize Firebase services
init_firebase_services() {
    print_info "Initializing Firebase services..."
    
    # Create firebase.json configuration
    cat > firebase.json << EOF
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "functions": {
    "source": "functions",
    "runtime": "nodejs18"
  },
  "hosting": {
    "public": "dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
EOF

    # Create Firestore rules
    cat > firestore.rules << EOF
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to compliance_rules for authenticated users
    match /compliance_rules/{document} {
      allow read, write: if true; // For development - restrict in production
    }
    
    // Allow read/write access to business_profiles
    match /business_profiles/{document} {
      allow read, write: if true; // For development - restrict in production
    }
    
    // Allow read/write access to rule_deduplication
    match /rule_deduplication/{document} {
      allow read, write: if true; // For development - restrict in production
    }
  }
}
EOF

    # Create Firestore indexes
    cat > firestore.indexes.json << EOF
{
  "indexes": [
    {
      "collectionGroup": "compliance_rules",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "applicability_criteria.business_types",
          "arrayConfig": "CONTAINS"
        },
        {
          "fieldPath": "applicability_criteria.states",
          "arrayConfig": "CONTAINS"
        },
        {
          "fieldPath": "status",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "priority",
          "order": "ASCENDING"
        }
      ]
    },
    {
      "collectionGroup": "compliance_rules",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "applicability_criteria.industries",
          "arrayConfig": "CONTAINS"
        },
        {
          "fieldPath": "status",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "priority",
          "order": "ASCENDING"
        }
      ]
    },
    {
      "collectionGroup": "compliance_rules",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "authority",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "level",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "status",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "updated_at",
          "order": "DESCENDING"
        }
      ]
    }
  ],
  "fieldOverrides": []
}
EOF

    # Deploy Firestore rules and indexes
    firebase deploy --only firestore:rules,firestore:indexes
    
    print_status "Firebase services initialized"
}

# Generate service account key
generate_service_account() {
    print_info "Generating service account key..."
    
    PROJECT_ID=$(cat .firebase-project-id)
    
    # Create service account
    gcloud iam service-accounts create firebase-admin \
        --display-name="Firebase Admin SDK" \
        --project="$PROJECT_ID" || true
    
    # Grant necessary roles
    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
        --member="serviceAccount:firebase-admin@$PROJECT_ID.iam.gserviceaccount.com" \
        --role="roles/firebase.admin"
    
    # Generate and download key
    gcloud iam service-accounts keys create serviceAccountKey.json \
        --iam-account="firebase-admin@$PROJECT_ID.iam.gserviceaccount.com" \
        --project="$PROJECT_ID"
    
    print_status "Service account key generated"
}

# Update .env file with Firebase credentials
update_env_file() {
    print_info "Updating .env file with Firebase credentials..."
    
    PROJECT_ID=$(cat .firebase-project-id)
    
    # Extract credentials from service account key
    PRIVATE_KEY=$(cat serviceAccountKey.json | jq -r '.private_key' | sed 's/$/\\n/g' | tr -d '\n')
    CLIENT_EMAIL=$(cat serviceAccountKey.json | jq -r '.client_email')
    
    # Update .env file
    sed -i.bak "s/FIREBASE_PROJECT_ID=.*/FIREBASE_PROJECT_ID=$PROJECT_ID/" .env
    sed -i.bak "s|FIREBASE_PRIVATE_KEY=.*|FIREBASE_PRIVATE_KEY=\"$PRIVATE_KEY\"|" .env
    sed -i.bak "s/FIREBASE_CLIENT_EMAIL=.*/FIREBASE_CLIENT_EMAIL=$CLIENT_EMAIL/" .env
    
    # Remove backup file
    rm .env.bak
    
    print_status ".env file updated with Firebase credentials"
}

# Run tests
run_tests() {
    print_info "Running test suite..."
    
    print_info "Testing OpenAI connection..."
    npm run test:openai
    
    print_info "Testing Firebase connection..."
    npm run test:firebase
    
    print_info "Testing AI rule generation..."
    npm run test:ai-generation
    
    print_info "Running end-to-end test..."
    npm run test:end-to-end
    
    print_status "All tests completed successfully!"
}

# Main setup function
main() {
    echo ""
    print_info "Starting automated setup process..."
    echo ""
    
    # Check prerequisites
    check_node
    check_npm
    
    # Install dependencies
    install_dependencies
    
    # Firebase setup
    install_firebase_cli
    firebase_login
    
    # Check if gcloud is available for service account creation
    if command -v gcloud &> /dev/null; then
        create_firebase_project
        init_firebase_services
        generate_service_account
        update_env_file
    else
        print_warning "Google Cloud CLI not found. Manual Firebase setup required."
        print_info "Please follow these steps:"
        print_info "1. Go to https://console.firebase.google.com"
        print_info "2. Create a new project"
        print_info "3. Enable Firestore"
        print_info "4. Generate service account key"
        print_info "5. Update .env file with credentials"
        exit 1
    fi
    
    # Run tests
    run_tests
    
    echo ""
    print_status "🎉 SETUP COMPLETED SUCCESSFULLY!"
    echo ""
    print_info "Your compliance platform is ready to use!"
    print_info "Project ID: $(cat .firebase-project-id)"
    print_info "Next steps:"
    print_info "  1. Run 'npm run test:end-to-end' to verify everything works"
    print_info "  2. Start building your frontend with React"
    print_info "  3. Scale up to 100+ rules for production"
    echo ""
}

# Run main function
main "$@"
