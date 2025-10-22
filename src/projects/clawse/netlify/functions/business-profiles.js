const admin = require('firebase-admin');

// Initialize Firebase
const initFirebase = () => {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
    });
  }
  return admin.firestore();
};

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
      },
      body: ''
    };
  }

  try {
    const db = initFirebase();
    const businessProfilesCollection = db.collection('business_profiles');

    switch (event.httpMethod) {
      case 'GET':
        // Get all business profiles or a specific one
        const profileId = event.queryStringParameters?.id;
        
        if (profileId) {
          const doc = await businessProfilesCollection.doc(profileId).get();
          if (!doc.exists) {
            return {
              statusCode: 404,
              headers: { 'Access-Control-Allow-Origin': '*' },
              body: JSON.stringify({ success: false, error: 'Profile not found' })
            };
          }
          return {
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
              success: true,
              data: { id: doc.id, ...doc.data() }
            })
          };
        } else {
          const snapshot = await businessProfilesCollection.limit(50).get();
          const profiles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          return {
            statusCode: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
              success: true,
              data: profiles
            })
          };
        }

      case 'POST':
        // Create new business profile
        const newProfile = JSON.parse(event.body);
        const docRef = await businessProfilesCollection.add({
          ...newProfile,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
        
        return {
          statusCode: 201,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
          body: JSON.stringify({
            success: true,
            data: { id: docRef.id, ...newProfile }
          })
        };

      default:
        return {
          statusCode: 405,
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

  } catch (error) {
    console.error('Business profiles error:', error);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};
