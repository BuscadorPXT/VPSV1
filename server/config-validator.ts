
interface RequiredEnvVars {
  DATABASE_URL: string;
  FIREBASE_PROJECT_ID: string;
  GOOGLE_SHEET_ID: string;
  SESSION_SECRET: string;
}

const requiredEnvVars: (keyof RequiredEnvVars)[] = [
  'DATABASE_URL', 
  'FIREBASE_PROJECT_ID',
  'GOOGLE_SHEET_ID',
  'SESSION_SECRET'
];

export function validateEnvironmentConfig(): void {
  const missingVars: string[] = [];
  const warnings: string[] = [];
  
  // Check required variables
  requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  });
  
  // Check optional but recommended variables
  if (!process.env.STRIPE_SECRET_KEY) {
    warnings.push('STRIPE_SECRET_KEY not set - payment features disabled');
  }
  
  if (!process.env.CORS_ORIGIN) {
    warnings.push('CORS_ORIGIN not set - using default origins');
  }
  
  if (process.env.NODE_ENV === 'production') {
    if (process.env.SESSION_SECRET === 'your-session-secret') {
      missingVars.push('SESSION_SECRET (must be changed from default)');
    }
    
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      warnings.push('FIREBASE_SERVICE_ACCOUNT_KEY not set - using limited Firebase features');
    }
  }
  
  // Report results
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => console.error(`   - ${varName}`));
    process.exit(1);
  }
  
  if (warnings.length > 0) {
    console.warn('⚠️ Environment warnings:');
    warnings.forEach(warning => console.warn(`   - ${warning}`));
  }
  
  console.log('✅ Environment configuration validated');
}

export function getConfig() {
  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '5000'),
    databaseUrl: process.env.DATABASE_URL!,
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    isProduction: process.env.NODE_ENV === 'production',
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY,
      publicKey: process.env.VITE_STRIPE_PUBLIC_KEY
    },
    firebase: {
      projectId: process.env.FIREBASE_PROJECT_ID!,
      serviceAccountKey: process.env.FIREBASE_SERVICE_ACCOUNT_KEY
    },
    googleSheets: {
      sheetId: process.env.GOOGLE_SHEET_ID!,
      serviceAccountPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH
    }
  };
}

