export type SubscriptionPlan = "free" | "pro" | "pro_pending" | "apoiador" | "business" | "admin" | "superadmin";

export interface PlanFeatures {
  name: string;
  displayName: string;
  description: string;
  price: string;
  features: string[];
  canViewPrices: boolean;
  canViewProducts: boolean;
  canViewSuppliers: boolean;
  canFilterBySuppliers: boolean;
  canExportData: boolean;
  canCreateAlerts: boolean;
  maxAlerts: number;
  hasAdminAccess: boolean;
  priority: boolean;
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlan, PlanFeatures> = {
  free: {
    name: "free",
    displayName: "Free",
    description: "Acesso limitado para testar",
    price: "Gratuito",
    features: [
      "Visualização básica de produtos",
      "Filtros limitados",
      "Histórico básico de preços"
    ],
    canViewPrices: true,
    canViewProducts: true,
    canViewSuppliers: false,
    canFilterBySuppliers: false,
    canExportData: false,
    canCreateAlerts: false,
    maxAlerts: 0,
    hasAdminAccess: false,
    priority: false
  },
  pro: {
    name: "pro",
    displayName: "Pro",
    description: "Visualização completa dos fornecedores e filtros",
    price: "R$ 29,90/mês",
    features: [
      "Visualização completa de fornecedores",
      "Todos os filtros disponíveis",
      "Histórico completo de preços",
      "Alertas de preço (até 10)",
      "Comparação avançada"
    ],
    canViewPrices: true,
    canViewProducts: true,
    canViewSuppliers: true,
    canFilterBySuppliers: true,
    canExportData: false,
    canCreateAlerts: true,
    maxAlerts: 10,
    hasAdminAccess: false,
    priority: false
  },
  pro_pending: {
    name: "pro_pending",
    displayName: "Pro - Pagamento Pendente",
    description: "Acesso suspenso - pagamento pendente",
    price: "R$ 29,90/mês",
    features: [
      "Acesso suspenso temporariamente",
      "Pagamento pendente de regularização"
    ],
    canViewPrices: false,
    canViewProducts: false,
    canViewSuppliers: false,
    canFilterBySuppliers: false,
    canExportData: false,
    canCreateAlerts: false,
    maxAlerts: 0,
    hasAdminAccess: false,
    priority: false
  },
  apoiador: {
    name: "apoiador",
    displayName: "Apoiador",
    description: "Acesso completo gratuito para parceiros e indicadores",
    price: "R$ 0,00",
    features: [
      "Visualização completa de fornecedores",
      "Todos os filtros disponíveis",
      "Histórico completo de preços",
      "Alertas de preço (até 10)",
      "Comparação avançada",
      "Acesso cortesia para parceiros"
    ],
    canViewPrices: true,
    canViewProducts: true,
    canViewSuppliers: true,
    canFilterBySuppliers: true,
    canExportData: false,
    canCreateAlerts: true,
    maxAlerts: 10,
    hasAdminAccess: false,
    priority: false
  },
  business: {
    name: "business",
    displayName: "Business",
    description: "Acesso completo + exportação de dados + prioridade",
    price: "R$ 79,90/mês",
    features: [
      "Todos os recursos do plano Pro",
      "Exportação de dados em Excel/CSV",
      "Alertas ilimitados",
      "Suporte prioritário",
      "API de acesso aos dados",
      "Relatórios personalizados"
    ],
    canViewPrices: true,
    canViewProducts: true,
    canViewSuppliers: true,
    canFilterBySuppliers: true,
    canExportData: true,
    canCreateAlerts: true,
    maxAlerts: -1, // unlimited
    hasAdminAccess: false,
    priority: true
  },
  admin: {
    name: "admin",
    displayName: "Admin",
    description: "Acesso administrativo completo",
    price: "Personalizado",
    features: [
      "Todos os recursos do Business",
      "Painel administrativo completo",
      "Gerenciamento de usuários",
      "Controle de permissões",
      "Logs de segurança",
      "Configurações do sistema"
    ],
    canViewPrices: true,
    canViewProducts: true,
    canViewSuppliers: true,
    canFilterBySuppliers: true,
    canExportData: true,
    canCreateAlerts: true,
    maxAlerts: -1,
    hasAdminAccess: true,
    priority: true
  },
  superadmin: {
    name: "superadmin",
    displayName: "Super Admin",
    description: "Acesso total ao sistema",
    price: "Personalizado",
    features: [
      "Todos os recursos do Admin",
      "Controle completo do sistema",
      "Configurações avançadas",
      "Acesso irrestrito a todas as funcionalidades",
      "Gerenciamento completo de dados",
      "Logs e auditoria completa"
    ],
    canViewPrices: true,
    canViewProducts: true,
    canViewSuppliers: true,
    canFilterBySuppliers: true,
    canExportData: true,
    canCreateAlerts: true,
    maxAlerts: -1,
    hasAdminAccess: true,
    priority: true
  }
};

export function getUserPlanFeatures(plan: SubscriptionPlan): PlanFeatures {
  return SUBSCRIPTION_PLANS[plan];
}

export function canUserAccessFeature(user: any, requiredFeature: 'canViewSuppliers' | 'canFilterBySuppliers' | 'canExportData' | 'canCreateAlerts' | 'hasAdminAccess' | 'whatsapp'): boolean {
  if (!user) return false;

  const userRole = user.role;
  const userPlan = user.subscriptionPlan;
  
  // Para WhatsApp: BLOQUEAR apenas usuários TESTER (case-sensitive para precisão)
  if (requiredFeature === 'whatsapp') {
    const isTester = userRole === 'tester' || userPlan === 'tester';
    return !isTester; // Retorna true se NÃO for tester
  }

  // Admin/SuperAdmin sempre têm acesso total para outros recursos
  if (userRole === 'admin' || userRole === 'superadmin' || user.isAdmin) {
    return true;
  }

  // Para outros recursos, verificar o plano
  const planFeatures = SUBSCRIPTION_PLANS[userPlan as SubscriptionPlan] || SUBSCRIPTION_PLANS['free'];
  return planFeatures[requiredFeature] || false;
}

export function canTesterAccessWhatsApp(user: any): boolean {
  if (!user) return false;
  
  // 🎯 LÓGICA SIMPLES: TESTER nunca pode acessar WhatsApp
  const isTester = user.role === 'tester' || user.subscriptionPlan === 'tester';
  return !isTester; // Retorna true se NÃO for tester
}

export function getPlanDisplayTag(plan: SubscriptionPlan): string {
  switch (plan) {
    case "free":
      return "Free 👤";
    case "pro":
      return "Pro ⭐";
    case "pro_pending":
      return "Pro - Pagamento Pendente ⏳";
    case "apoiador":
      return "Apoiador 🤝";
    case "business":
      return "Business 💼";
    case "admin":
      return "Admin 🛠️";
    case "superadmin":
      return "Super Admin ⚡";
    default:
      return "Free 👤";
  }
}

export function isAdminUser(plan: SubscriptionPlan, isAdmin?: boolean, role?: string): boolean {
  // Check for admin privileges - require both isAdmin flag AND admin role/plan
  return Boolean(
    (isAdmin && (role === 'admin' || role === 'superadmin')) ||
    (isAdmin && (plan === 'admin' || plan === 'superadmin'))
  );
}

export function getEffectivePlan(plan: SubscriptionPlan, isAdmin?: boolean, role?: string): SubscriptionPlan {
  // If user is admin, return their role as the effective plan
  if (isAdmin || role === 'admin' || role === 'superadmin') {
    return (role as SubscriptionPlan) || 'admin';
  }
  return plan;
}

// Centralized permission checking functions
export function hasAdminAccess(user: { isAdmin?: boolean; role?: string; subscriptionPlan?: SubscriptionPlan } | undefined): boolean {
  if (!user) return false;

  // FIXED: Admin access is ONLY granted to actual admin/superadmin users
  // PRO users should NOT have admin access - they have PRO privileges only
  return Boolean(
    user.role === 'admin' || 
    user.role === 'superadmin' || 
    (user.isAdmin && (user.role === 'admin' || user.role === 'superadmin')) ||
    (user.isAdmin && user.subscriptionPlan === 'admin')
  );
}

export function hasFullSystemAccess(user: { isAdmin?: boolean; role?: string } | undefined): boolean {
  if (!user) return false;

  // Full system access only for superadmin role with isAdmin true
  return Boolean(user.isAdmin && user.role === 'superadmin');
}