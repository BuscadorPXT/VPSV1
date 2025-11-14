import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Log missing environment variables
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY', 
  'VITE_FIREBASE_PROJECT_ID', 
  'VITE_FIREBASE_APP_ID',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID'
];
const missingVars = requiredEnvVars.filter(varName => !import.meta.env[varName]);
if (missingVars.length > 0) {
  console.warn('Missing Firebase environment variables:', missingVars);
} else {
  console.log('✅ All Firebase environment variables present');
}

// Initialize Firebase only if it hasn't been initialized already
let app;
try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
} catch (error) {
  console.error('Firebase initialization error:', error);
  // Fallback initialization
  app = initializeApp(firebaseConfig);
}

export const auth = getAuth(app);
export default app;