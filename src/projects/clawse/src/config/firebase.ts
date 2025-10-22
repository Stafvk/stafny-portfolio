import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Firebase Admin SDK
let firebaseApp: admin.app.App;

export function initializeFirebase(): admin.app.App {
  if (firebaseApp) {
    return firebaseApp;
  }

  try {
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    };

    // Validate required environment variables
    if (!serviceAccount.projectId || !serviceAccount.privateKey || !serviceAccount.clientEmail) {
      throw new Error('Missing required Firebase environment variables. Please check your .env file.');
    }

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      projectId: serviceAccount.projectId,
    });

    console.log('✅ Firebase Admin SDK initialized successfully');
    return firebaseApp;

  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin SDK:', error);
    throw error;
  }
}

// Get Firestore instance
export function getFirestore(): admin.firestore.Firestore {
  if (!firebaseApp) {
    initializeFirebase();
  }
  return admin.firestore();
}

// Get Firebase Auth instance
export function getAuth(): admin.auth.Auth {
  if (!firebaseApp) {
    initializeFirebase();
  }
  return admin.auth();
}

// Firestore field value helpers
export const FieldValue = admin.firestore.FieldValue;
export const Timestamp = admin.firestore.Timestamp;
