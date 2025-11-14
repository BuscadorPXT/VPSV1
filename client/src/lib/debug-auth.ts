// Debug authentication helper
import { auth } from './firebase';

export const debugAuthHeaders = async (): Promise<Record<string, string>> => {
  try {
    console.log('🔧 [DEBUG] Starting auth header generation...');
    
    // Check if user is authenticated
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.error('❌ [DEBUG] No authenticated user found');
      throw new Error('User not authenticated');
    }
    
    console.log('✅ [DEBUG] User found:', currentUser.email);
    
    // Get Firebase token
    const token = await currentUser.getIdToken(false);
    console.log('✅ [DEBUG] Firebase token obtained');
    
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
    
  } catch (error) {
    console.error('❌ [DEBUG] Auth header generation failed:', error);
    throw error;
  }
};