import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let authInstance: any = null;
let initialized = false;

async function initializeGoogleAuth() {
  if (initialized && authInstance) {
    return authInstance;
  }

  try {
    // Try multiple possible locations for the credentials file
    const possiblePaths = [
      path.join(process.cwd(), 'google-service-account.json'),
      path.join(process.cwd(), 'attached_assets', 'google-service-account.json'),
      path.join(__dirname, '../../google-service-account.json'),
      path.join(__dirname, '../../attached_assets/google-service-account.json')
    ];
    
    let credentialsPath = '';
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        credentialsPath = possiblePath;
        console.log(`✅ Found Google service account file at: ${credentialsPath}`);
        break;
      }
    }
    
    if (!credentialsPath) {
      console.warn('⚠️ Google service account file not found in any of these locations:');
      possiblePaths.forEach(p => console.warn(`   - ${p}`));
      throw new Error('Google service account file not found. Please upload the credentials file.');
    }
    
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf-8'));
    
    authInstance = new google.auth.GoogleAuth({
      credentials,
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets.readonly',
        'https://www.googleapis.com/auth/spreadsheets'
      ],
    });

    initialized = true;
    console.log('✅ Google Auth service initialized successfully');
    return authInstance;
  } catch (error) {
    console.error('❌ Failed to initialize Google Auth:', error);
    throw error;
  }
}

export async function getGoogleAuth() {
  return await initializeGoogleAuth();
}

export async function getAuthenticatedSheetsClient() {
  const auth = await getGoogleAuth();
  return google.sheets({ version: 'v4', auth });
}

export default {
  getGoogleAuth,
  getAuthenticatedSheetsClient
};
