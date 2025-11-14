
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
                 user.role === 'admin' || 
                 user.role === 'superadmin' ||
                 user.role === 'super_admin';
                 
  const isPro = user.role === 'pro' || 
               user.subscriptionPlan === 'pro' ||
               user.subscriptionPlan === 'PRO';
               
  const isBusiness = user.role === 'business' || 
                    user.subscriptionPlan === 'business' ||
                    user.subscriptionPlan === 'BUSINESS';
                    
  const isTester = user.role === 'tester' || 
                   user.subscriptionPlan === 'tester';
                    
  const hasSpecialRole = isAdmin || isPro || isBusiness || isTester;
  
  // Special roles are ALWAYS approved, regardless of database status
  const isApproved = hasSpecialRole || user.isApproved === true || user.status === 'approved';
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

export function shouldAutoApprove(user: UserRole): boolean {
  const { hasSpecialRole } = checkUserRoles(user);
  // Only auto-approve if user has special role but isn't already approved
  return hasSpecialRole && !user.isApproved && user.status !== 'approved';
}
