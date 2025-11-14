// Frontend version of centralized auth utilities
export interface UserRole {
  uid: string;
  email: string;
  role?: string;
  subscriptionPlan?: string;
  isAdmin?: boolean;
  isApproved?: boolean;
  status?: string;
}

export function checkUserRoles(user: UserRole) {
  // Centralized role checking logic - SINGLE SOURCE OF TRUTH
  const isAdmin = user.isAdmin === true ||
                 user.role?.toLowerCase() === 'admin' ||
                 user.role?.toLowerCase() === 'superadmin' ||
                 user.role?.toLowerCase() === 'super_admin';

  const isPro = user.role?.toLowerCase() === 'pro' ||
               user.subscriptionPlan?.toLowerCase() === 'pro';

  const isBusiness = user.role?.toLowerCase() === 'business' ||
                    user.subscriptionPlan?.toLowerCase() === 'business';

  const isTester = user.role?.toLowerCase() === 'tester' ||
                  user.subscriptionPlan?.toLowerCase() === 'tester';

  const hasSpecialRole = isAdmin || isPro || isBusiness;

  // Special roles are ALWAYS approved, regardless of database status
  // TESTER users should NOT be automatically approved
  const isApproved = hasSpecialRole || (!isTester && (user.isApproved === true || user.status === 'approved'));
  const needsApproval = !isApproved;

  return {
    isAdmin,
    isPro,
    isBusiness,
    isTester,
    hasSpecialRole,
    needsApproval,
    isApproved
  };
}

export const getSessionToken = async (): Promise<string | null> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.log('🚫 No Firebase user found');
      return null;
    }

    // Wait for user to be fully loaded
    await new Promise((resolve) => {
      if (user.emailVerified !== undefined) {
        resolve(true);
      } else {
        const unsubscribe = auth.onAuthStateChanged((updatedUser) => {
          if (updatedUser) {
            unsubscribe();
            resolve(true);
          }
        });

        // Timeout after 5 seconds
        setTimeout(() => {
          unsubscribe();
          resolve(true);
        }, 5000);
      }
    });

    const token = await user.getIdToken(true); // Force refresh
    console.log('🎫 Session token retrieved successfully');

    // Store token in localStorage for immediate access
    localStorage.setItem('firebaseToken', token);

    return token;
  } catch (error) {
    console.error('❌ Error getting session token:', error);
    return null;
  }
};