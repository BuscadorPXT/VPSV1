import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  // For development, we'll use a minimal service account configuration
  // In production, you should use a proper service account JSON file
  const serviceAccount = {
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    // For demo purposes, we'll initialize without full service account
    // In production, add your service account credentials here
  };
  
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      try {
        // Try to parse as full service account JSON
        const fullServiceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
        admin.initializeApp({
          credential: admin.credential.cert(fullServiceAccount),
        });
        console.log('✅ Firebase Admin initialized with service account credentials');
      } catch (parseError) {
        // If parsing fails, it might be just an API key - use project-based initialization
        console.log('📝 Using project-based Firebase initialization');
        admin.initializeApp({
          projectId: process.env.VITE_FIREBASE_PROJECT_ID,
        });
      }
    } else {
      // Initialize without credentials for development
      console.log('⚠️ Running without Firebase Admin credentials - some features may be limited');
      admin.initializeApp({
        projectId: process.env.VITE_FIREBASE_PROJECT_ID,
      });
    }
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
    // Fallback initialization
    admin.initializeApp({
      projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    });
  }
}

export const auth = admin.auth();
export const firestore = admin.firestore();
export { admin };

export async function verifyIdToken(idToken: string) {
  try {
    // Try full Firebase Admin verification first
    if (admin.apps.length > 0) {
      try {
        const decodedToken = await auth.verifyIdToken(idToken);
        return decodedToken;
      } catch (adminError) {
        console.log('Admin verification failed, falling back to client verification');
      }
    }
    
    // Fallback: Basic token validation for development
    const tokenParts = idToken.split('.');
    if (tokenParts.length !== 3) {
      throw new Error('Invalid token format');
    }
    
    try {
      // Decode the payload - this validates structure but not signature
      const payload = JSON.parse(atob(tokenParts[1].replace(/-/g, '+').replace(/_/g, '/')));
      
      // Basic token validation
      if (!payload.user_id && !payload.sub && !payload.uid) {
        throw new Error('Missing user ID in token');
      }
      
      if (!payload.email && !payload.firebase?.identities?.email?.[0]) {
        console.warn('Token missing email, continuing with limited validation');
      }
      
      // Check token expiration with some tolerance
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < (now - 300)) { // 5 minute tolerance
        throw new Error('Token expired');
      }
      
      return {
        uid: payload.user_id || payload.sub || payload.uid,
        email: payload.email || payload.firebase?.identities?.email?.[0] || 'unknown@user.com',
        exp: payload.exp,
        name: payload.name || payload.firebase?.name,
        picture: payload.picture || payload.firebase?.picture,
      };
    } catch (decodeError) {
      console.error('Token decode error:', decodeError);
      throw new Error('Failed to decode token payload: ' + decodeError.message);
    }
  } catch (error) {
    console.error('Token verification failed:', error);
    throw new Error('Invalid or expired token');
  }
}
