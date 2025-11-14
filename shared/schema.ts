import { pgTable, text, serial, integer, boolean, timestamp, decimal, varchar, jsonb, unique, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  firebaseUid: text('firebase_uid').unique().notNull(),
  email: text('email').notNull(),
  name: text('name').notNull(),
  company: text('company'),
  phone: text('phone'),
  role: text('role').default('user'),
  status: text('status').default('pending_approval'),
  isApproved: boolean('is_approved').default(false),
  isAdmin: boolean('is_admin').default(false),
  subscriptionPlan: text('subscription_plan').default('free'),
  isSubscriptionActive: boolean('is_subscription_active').default(false),
  approvedAt: timestamp('approved_at'),
  approvedBy: integer('approved_by'),
  // Tester-specific fields
  testerStartedAt: timestamp('tester_started_at'),
  testerExpiresAt: timestamp('tester_expires_at'),
  isTesterExpired: boolean('is_tester_expired').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  lastLoginAt: timestamp('last_login_at'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  sessionToken: text('session_token'),
  profileImageUrl: text('profile_image_url'),
  preferredCurrency: text('preferred_currency').default('BRL'),
  notificationPreferences: jsonb('notification_preferences'),
  isActive: boolean('is_active').default(true),
  subscriptionExpiresAt: timestamp('subscription_expires_at'),
  trialStartedAt: timestamp('trial_started_at'),
  trialExpiresAt: timestamp('trial_expires_at'),
  promotionEndDate: timestamp('promotion_end_date'),
  isPromotionActive: boolean('is_promotion_active').default(false),
  trialUsed: boolean('trial_used').default(false),
  loginAttempts: integer('login_attempts').default(0),
  lastLoginAttemptAt: timestamp('last_login_attempt_at'),
  accountLocked: boolean('account_locked').default(false),
  lockUntil: timestamp('lock_until'),
  emailVerified: boolean('email_verified').default(false),
  emailVerificationToken: text('email_verification_token'),
  statusChangedAt: timestamp('status_changed_at'),
  statusChangedBy: integer('status_changed_by'),
  suspensionReason: text('suspension_reason'),
  roleChangedAt: timestamp('role_changed_at'),
  roleChangedBy: integer('role_changed_by'),
  passwordResetToken: text('password_reset_token'),
  passwordResetExpires: timestamp('password_reset_expires'),
  twoFactorEnabled: boolean('two_factor_enabled').default(false),
  twoFactorSecret: text('two_factor_secret'),
  recoveryCodesUsed: integer('recovery_codes_used').default(0),
  lastPasswordChangedAt: timestamp('last_password_changed_at'),
  loginHistory: jsonb('login_history'),
  securityAlerts: boolean('security_alerts').default(true),
  gdprConsentAt: timestamp('gdpr_consent_at'),
  marketingConsentAt: timestamp('marketing_consent_at'),
  dataRetentionExpiresAt: timestamp('data_retention_expires_at'),
  apiKeyId: text('api_key_id'),
  apiKeyCreatedAt: timestamp('api_key_created_at'),
  rateLimitTier: text('rate_limit_tier').default('basic'),
  monthlyApiCalls: integer('monthly_api_calls').default(0),
  maxMonthlyApiCalls: integer('max_monthly_api_calls').default(1000),
  currentApiCallCount: integer('current_api_call_count').default(0),
  apiCallsResetAt: timestamp('api_calls_reset_at'),
  webhookUrl: text('webhook_url'),
  webhookEvents: jsonb('webhook_events'),
  lastWebhookCallAt: timestamp('last_webhook_call_at'),
  webhookFailureCount: integer('webhook_failure_count').default(0),
  customFields: jsonb('custom_fields'),
  integrationSettings: jsonb('integration_settings'),
  termsAcceptedAt: timestamp('terms_accepted_at'),
  termsVersion: text('terms_version'),
  // Subscription Management Extensions
  subscriptionNickname: text('subscription_nickname'),
  manualRenewalOverride: boolean('manual_renewal_override').default(false),
  subscriptionNotes: text('subscription_notes'),
  // Session Security Settings
  maxConcurrentIps: integer('max_concurrent_ips').default(5).notNull()
});

export const activeSessions = pgTable('active_sessions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  sessionId: text('session_id').notNull().unique(),
  ipAddress: text('ip_address').notNull(),
  city: text('city'),
  country: text('country'),
  countryCode: text('country_code'),
  latitude: decimal('latitude', { precision: 10, scale: 7 }),
  longitude: decimal('longitude', { precision: 10, scale: 7 }),
  userAgent: text('user_agent'),
  deviceInfo: text('device_info'),
  connectedAt: timestamp('connected_at').defaultNow().notNull(),
  lastActivityAt: timestamp('last_activity_at').defaultNow().notNull(),
});

export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  model: text("model").notNull(),
  brand: text("brand").notNull(),
  storage: text("storage").notNull(),
  color: text("color").notNull(),
  category: text("category"), // CAT
  capacity: text("capacity"), // GB  
  region: text("region"), // REGIÃO
  date: text("date"), // Data da aba (ex: "29-05")
  supplierId: integer("supplier_id").references(() => suppliers.id).notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  sku: text("sku"),
  available: boolean("available").default(true).notNull(),
  isLowestPrice: boolean("is_lowest_price").default(false).notNull(),
  sheetRowId: text("sheet_row_id"), // ID único da linha na planilha para identificação
  productTimestamp: text("product_timestamp"), // Horário que o produto subiu no sistema (coluna H da planilha)
  ultimaAtualizacao: timestamp('ultima_atualizacao').defaultNow(),
  searchVector: text('search_vector'), // tsvector para Full-Text Search
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const devices = pgTable("devices", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(), // iPhone, MacBook, iPad, etc.
  model: text("model").notNull(), // iPhone 15 Pro Max, MacBook Air M2, etc.
  variant: text("variant"), // Pro, Max, mini, etc.
  storage: text("storage").notNull(), // 128GB, 256GB, 512GB, etc.
  color: text("color").notNull(), // Black Titanium, Natural Titanium, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const syncLogs = pgTable("sync_logs", {
  id: serial("id").primaryKey(),
  status: text("status").notNull(), // 'success', 'error', 'in_progress'
  message: text("message"),
  recordsProcessed: integer("records_processed").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const priceAlerts = pgTable("price_alerts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  model: text("model").notNull(),
  thresholdPrice: decimal("threshold_price", { precision: 10, scale: 2 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  isNotified: boolean("is_notified").default(false).notNull(),
  notifiedAt: timestamp("notified_at"),
  // Enhanced notification preferences
  emailNotification: boolean("email_notification").default(true).notNull(),
  webPushNotification: boolean("web_push_notification").default(true).notNull(),
  // Enhanced targeting
  brand: text("brand"), // Optional brand filter
  capacity: text("capacity"), // Optional capacity filter (e.g., "128GB", "256GB")
  color: text("color"), // Optional color filter
  region: text("region"), // Optional region filter
  // Alert frequency control
  lastTriggeredAt: timestamp("last_triggered_at"),
  triggerCount: integer("trigger_count").default(0).notNull(),
  maxTriggers: integer("max_triggers").default(5).notNull(), // Prevent spam
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notificationHistory = pgTable("notification_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  alertId: integer("alert_id").references(() => priceAlerts.id),
  type: text("type").notNull(), // 'price_alert', 'price_drop', 'new_product', 'sync_complete'
  title: text("title").notNull(),
  message: text("message").notNull(),
  data: text("data"), // JSON data for the notification
  channel: text("channel").notNull(), // 'websocket', 'email', 'push'
  status: text("status").notNull(), // 'sent', 'delivered', 'failed', 'read'
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userSessions = pgTable("user_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("userId").references(() => users.id).notNull().unique(),
  sessionToken: text("session_token").notNull().unique(),
  ipAddress: text("ip_address").notNull(),
  lastActivity: timestamp("lastActivity").defaultNow().notNull(),
  userAgent: text("user_agent"),
  isActive: boolean("is_active").default(true).notNull(),
  loginAttempts: integer("login_attempts").default(0).notNull(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const securityLogs = pgTable("security_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  ipAddress: text("ip_address").notNull(),
  action: text("action").notNull(), // 'login_success', 'login_denied', 'ip_change', 'logout'
  reason: text("reason"), // 'ip_conflict', 'session_expired', etc.
  userAgent: text("user_agent"),
  success: boolean("success").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const roleChangeLogs = pgTable("role_change_logs", {
  id: serial("id").primaryKey(),
  targetUserId: integer("target_user_id").references(() => users.id).notNull(),
  changedByUserId: integer("changed_by_user_id").references(() => users.id).notNull(),
  previousRole: text("previous_role").notNull(),
  newRole: text("new_role").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// New tables for expanded admin functionality
export const customRoles = pgTable("custom_roles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  permissions: text("permissions").array().default([]).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdByUserId: integer("created_by_user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userNotes = pgTable("user_notes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  note: text("note").notNull(),
  isInternal: boolean("is_internal").default(true).notNull(),
  createdByUserId: integer("created_by_user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const subscriptionHistory = pgTable("subscription_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  previousPlan: text("previous_plan"),
  newPlan: text("new_plan").notNull(),
  paymentStatus: text("payment_status").notNull(), // 'pending', 'paid', 'failed', 'refunded'
  amount: decimal("amount", { precision: 10, scale: 2 }),
  paymentMethod: text("payment_method"),
  transactionId: text("transaction_id"),
  changedByUserId: integer("changed_by_user_id").references(() => users.id),
  reason: text("reason"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const systemLogs = pgTable("system_logs", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // 'login', 'logout', 'plan_change', 'admin_action', 'error'
  action: text("action").notNull(),
  userId: integer("user_id").references(() => users.id),
  adminUserId: integer("admin_user_id").references(() => users.id),
  details: text("details"), // JSON string for additional data
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  severity: text("severity").default("info").notNull(), // 'info', 'warning', 'error', 'critical'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const adminActionLogs = pgTable("admin_action_logs", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id").references(() => users.id).notNull(),
  targetUserId: integer("target_user_id").references(() => users.id),
  action: text("action").notNull(), // 'approve_subscription', 'deny_subscription', 'renew_subscription', 'revoke_renewal'
  previousStatus: text("previous_status"),
  newStatus: text("new_status"),
  previousPlan: text("previous_plan"),
  newPlan: text("new_plan"),
  expirationDate: timestamp("expiration_date"),
  reason: text("reason"),
  duration: text("duration"), // For renewals: '1 month', '3 months', etc.
  ipAddress: text("ip_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const adminImpersonationLogs = pgTable('admin_impersonation_logs', {
  id: serial('id').primaryKey(),
  adminId: integer('admin_id').notNull(),
  targetUserId: integer('target_user_id').notNull(),
  impersonationToken: varchar('impersonation_token', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  endedAt: timestamp('ended_at'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const userActivityLogs = pgTable('user_activity_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  action: varchar('action', { length: 100 }).notNull(),
  details: text('details'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const systemSettings = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value"),
  type: text("type").default("string").notNull(), // 'string', 'number', 'boolean', 'json'
  description: text("description"),
  isPublic: boolean("is_public").default(false).notNull(),
  updatedByUserId: integer("updated_by_user_id").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ================================
// PROFIT MARGINS SYSTEM TABLES
// ================================
export const userProfitMarginsCategories = pgTable("user_profit_margins_categories", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  categoryName: varchar("category_name", { length: 100 }).notNull(),
  marginPercentage: decimal("margin_percentage", { precision: 5, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  uniqueUserCategory: unique().on(table.userId, table.categoryName),
}));

export const userProfitMarginsProducts = pgTable("user_profit_margins_products", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  productId: varchar("product_id", { length: 255 }).notNull(),
  productName: varchar("product_name", { length: 500 }),
  marginPercentage: decimal("margin_percentage", { precision: 5, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  uniqueUserProduct: unique().on(table.userId, table.productId),
}));

export const systemAnnouncements = pgTable("system_announcements", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").default("info").notNull(), // 'info', 'warning', 'success', 'error'
  targetAudience: text("target_audience").array().default(["all"]).notNull(), // ['all', 'free', 'pro', 'business', 'admin']
  isActive: boolean("is_active").default(true).notNull(),
  isPermanent: boolean("is_permanent").default(false).notNull(),
  expiresAt: timestamp("expires_at"),
  createdByUserId: integer("created_by_user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const systemNotifications = pgTable("system_notifications", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").default("info").notNull(), // 'info', 'warning', 'success', 'error', 'news', 'update'
  priority: text("priority").default("normal").notNull(), // 'low', 'normal', 'high', 'urgent'
  targetAudience: text("target_audience").array().default(["all"]).notNull(), // ['all', 'free', 'pro', 'business', 'admin']
  isActive: boolean("is_active").default(true).notNull(),
  showAsPopup: boolean("show_as_popup").default(true).notNull(),
  showAsBanner: boolean("show_as_banner").default(false).notNull(),
  expiresAt: timestamp("expires_at"),
  createdByUserId: integer("created_by_user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userNotificationReads = pgTable("user_notification_reads", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  notificationId: integer("notification_id").references(() => systemNotifications.id).notNull(),
  readAt: timestamp("read_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userFavorites = pgTable("user_favorites", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  type: text("type").notNull(), // 'product', 'supplier'
  itemId: text("item_id").notNull(), // product ID or supplier name
  metadata: text("metadata"), // JSON string for additional data
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const emergencyAlerts = pgTable("emergency_alerts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  urgency: text("urgency").default("medium").notNull(), // 'low', 'medium', 'high'
  sentBy: integer("sent_by").references(() => users.id).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const emergencyAlertViews = pgTable("emergency_alert_views", {
  id: serial("id").primaryKey(),
  alertId: integer("alert_id").references(() => emergencyAlerts.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  viewedAt: timestamp("viewed_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sheetsWebhookLogs = pgTable("sheets_webhook_logs", {
  id: serial("id").primaryKey(),
  sheetId: text("sheet_id").notNull(),
  sheetName: text("sheet_name").notNull(),
  range: text("range").notNull(),
  eventType: text("event_type").notNull(), // 'EDIT', 'INSERT', 'DELETE'
  rowNumber: integer("row_number"),
  columnNumber: integer("column_number"),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  userEmail: text("user_email"),
  productsUpdated: integer("products_updated").default(0).notNull(),
  status: text("status").notNull(), // 'processed', 'failed', 'ignored'
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const priceChangeEvents = pgTable("price_change_events", {
  id: serial("id").primaryKey(),
  productId: text("product_id").notNull(),
  sheetName: text("sheet_name").notNull(),
  rowIndex: integer("row_index").notNull(),
  model: text("model").notNull(),
  supplier: text("supplier").notNull(),
  oldPrice: decimal("old_price", { precision: 10, scale: 2 }).notNull(),
  newPrice: decimal("new_price", { precision: 10, scale: 2 }).notNull(),
  priceDrop: decimal("price_drop", { precision: 10, scale: 2 }).notNull(),
  dropPercentage: decimal("drop_percentage", { precision: 5, scale: 2 }).notNull(),
  wasMovedToTop: boolean("was_moved_to_top").default(false).notNull(),
  wasSheetSorted: boolean("was_sheet_sorted").default(false).notNull(),
  processingStatus: text("processing_status").default("pending").notNull(), // 'pending', 'processed', 'failed'
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const priceDropNotifications = pgTable("price_drop_notifications", {
  id: serial("id").primaryKey(),
  productId: text("product_id").notNull(),
  model: text("model").notNull(),
  storage: text("storage"),
  color: text("color"),
  region: text("region"),
  supplier: text("supplier").notNull(),
  oldPrice: decimal("old_price", { precision: 10, scale: 2 }).notNull(),
  newPrice: decimal("new_price", { precision: 10, scale: 2 }).notNull(),
  priceDrop: decimal("price_drop", { precision: 10, scale: 2 }).notNull(),
  dropPercentage: decimal("drop_percentage", { precision: 5, scale: 2 }).notNull(),
  notificationSent: boolean("notification_sent").default(false).notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// New Apple catalog tables for smart filtering
export const appleProducts = pgTable("apple_products", {
  id: serial("id").primaryKey(),
  modelName: text("model_name").notNull(),
  categoryCode: text("category_code").notNull(), // iPhone, MacBook, iPad, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const productVariants = pgTable("product_variants", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => appleProducts.id).notNull(),
  color: text("color").notNull(),
  storage: text("storage").notNull(),
  sizeMM: text("size_mm"), // For Apple Watch sizes
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const availableVariants = pgTable("available_variants", {
  id: serial("id").primaryKey(),
  variantId: integer("variant_id").references(() => productVariants.id).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Interest List table for shopping cart functionality
export const interestList = pgTable("interest_list", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  productModel: text("product_model").notNull(),
  productBrand: text("product_brand").notNull(),
  productStorage: text("product_storage").notNull(),
  productColor: text("product_color").notNull(),
  productCategory: text("product_category"),
  productCapacity: text("product_capacity"),
  productRegion: text("product_region"),
  supplierName: text("supplier_name").notNull(),
  supplierPrice: decimal("supplier_price", { precision: 10, scale: 2 }).notNull(),
  quantity: integer("quantity").default(1).notNull(),
  dateAdded: text("date_added").notNull(), // Date when the product was available
  // Profit margin calculation fields
  marginValue: decimal("margin_value", { precision: 10, scale: 2 }), // User's margin value
  marginType: text("margin_type").default("percentage"), // "percentage" or "fixed"
  salesPrice: decimal("sales_price", { precision: 10, scale: 2 }), // Calculated sales price
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userProductSupplierUnique: unique().on(table.userId, table.productModel, table.productBrand, table.productStorage, table.productColor, table.supplierName),
}));

// Subscription Management table for admin control
export const subscriptionManagement = pgTable("subscription_management", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull().unique(),
  paymentDate: timestamp("payment_date"),
  renewalDate: timestamp("renewal_date"),
  daysUntilRenewal: integer('days_until_renewal').default(0).notNull(),
  notes: text("notes"),
  nickname: text("nickname"),
  paymentMethod: text("payment_method"),
  paymentAmount: decimal("payment_amount", { precision: 10, scale: 2 }),
  paymentStatus: text("payment_status").default("ativo").notNull(), // ativo, pendente, suspenso, cancelado
  adminId: integer("admin_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertActiveSessionSchema = createInsertSchema(activeSessions).omit({
  id: true,
  connectedAt: true,
  lastActivityAt: true,
});

export const insertSupplierSchema = createInsertSchema(suppliers).omit({
  id: true,
  createdAt: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// ================================
// PROFIT MARGINS SCHEMAS
// ================================
export const insertUserProfitMarginsCategorySchema = createInsertSchema(userProfitMarginsCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserProfitMarginsProductSchema = createInsertSchema(userProfitMarginsProducts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type UserProfitMarginCategory = typeof userProfitMarginsCategories.$inferSelect;
export type UserProfitMarginProduct = typeof userProfitMarginsProducts.$inferSelect;
export type InsertUserProfitMarginCategory = z.infer<typeof insertUserProfitMarginsCategorySchema>;
export type InsertUserProfitMarginProduct = z.infer<typeof insertUserProfitMarginsProductSchema>;

export interface UserMargins {
  categories: UserProfitMarginCategory[];
  products: UserProfitMarginProduct[];
}

export const insertSyncLogSchema = createInsertSchema(syncLogs).omit({
  id: true,
  createdAt: true,
});

export const insertPriceAlertSchema = createInsertSchema(priceAlerts).omit({
  id: true,
  createdAt: true,
  isNotified: true,
  notifiedAt: true,
  lastTriggeredAt: true,
  triggerCount: true,
});

export const insertNotificationHistorySchema = createInsertSchema(notificationHistory).omit({
  id: true,
  createdAt: true,
  readAt: true,
});

export const insertDeviceSchema = createInsertSchema(devices).omit({
  id: true,
  createdAt: true,
});

export const insertInterestListSchema = createInsertSchema(interestList).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSubscriptionManagementSchema = createInsertSchema(subscriptionManagement).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  daysUntilRenewal: true,
});

export type InsertDevice = z.infer<typeof insertDeviceSchema>;
export type Device = typeof devices.$inferSelect;

export type InsertInterestList = z.infer<typeof insertInterestListSchema>;
export type InterestList = typeof interestList.$inferSelect;

export type InsertSubscriptionManagement = z.infer<typeof insertSubscriptionManagementSchema>;
export type SubscriptionManagement = typeof subscriptionManagement.$inferSelect;

export const insertUserSessionSchema = createInsertSchema(userSessions).omit({
  id: true,
  createdAt: true,
  lastActivity: true,
});

export const insertSecurityLogSchema = createInsertSchema(securityLogs).omit({
  id: true,
  createdAt: true,
});

export const insertRoleChangeLogSchema = createInsertSchema(roleChangeLogs).omit({
  id: true,
  createdAt: true,
});

export const insertCustomRoleSchema = createInsertSchema(customRoles).omit({
  id: true,
  createdAt: true,
});

export const insertUserNoteSchema = createInsertSchema(userNotes).omit({
  id: true,
  createdAt: true,
});

export const insertSubscriptionHistorySchema = createInsertSchema(subscriptionHistory).omit({
  id: true,
  createdAt: true,
});

export const insertSystemLogSchema = createInsertSchema(systemLogs).omit({
  id: true,
  createdAt: true,
});

export const insertAdminActionLogSchema = createInsertSchema(adminActionLogs).omit({
  id: true,
  createdAt: true,
});

export const insertSystemSettingSchema = createInsertSchema(systemSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSystemAnnouncementSchema = createInsertSchema(systemAnnouncements).omit({
  id: true,
  createdAt: true,
});

export const insertSystemNotificationSchema = createInsertSchema(systemNotifications).omit({
  id: true,
  createdAt: true,
});

export const insertUserNotificationReadSchema = createInsertSchema(userNotificationReads).omit({
  id: true,
  createdAt: true,
  readAt: true,
});

export const insertUserFavoriteSchema = createInsertSchema(userFavorites).omit({
  id: true,
  createdAt: true,
});

export const insertEmergencyAlertSchema = createInsertSchema(emergencyAlerts).omit({
  id: true,
  createdAt: true,
  sentAt: true,
});

export const insertEmergencyAlertViewSchema = createInsertSchema(emergencyAlertViews).omit({
  id: true,
  createdAt: true,
  viewedAt: true,
});

export const insertSheetsWebhookLogSchema = createInsertSchema(sheetsWebhookLogs).omit({
  id: true,
  createdAt: true,
});

export const insertPriceDropNotificationSchema = createInsertSchema(priceDropNotifications).omit({
  id: true,
  createdAt: true,
  readAt: true,
});

export const insertAppleProductSchema = createInsertSchema(appleProducts).omit({
  id: true,
  createdAt: true,
});

export const insertProductVariantSchema = createInsertSchema(productVariants).omit({
  id: true,
  createdAt: true,
});

export const insertAvailableVariantSchema = createInsertSchema(availableVariants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type ActiveSession = typeof activeSessions.$inferSelect;
export type InsertActiveSession = z.infer<typeof insertActiveSessionSchema>;

export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type SyncLog = typeof syncLogs.$inferSelect;
export type InsertSyncLog = z.infer<typeof insertSyncLogSchema>;

export type PriceAlert = typeof priceAlerts.$inferSelect;
export type InsertPriceAlert = z.infer<typeof insertPriceAlertSchema>;

export type NotificationHistory = typeof notificationHistory.$inferSelect;
export type InsertNotificationHistory = z.infer<typeof insertNotificationHistorySchema>;

export type UserSession = typeof userSessions.$inferSelect;
export type InsertUserSession = z.infer<typeof insertUserSessionSchema>;

export type SecurityLog = typeof securityLogs.$inferSelect;
export type InsertSecurityLog = z.infer<typeof insertSecurityLogSchema>;

export type RoleChangeLog = typeof roleChangeLogs.$inferSelect;
export type InsertRoleChangeLog = z.infer<typeof insertRoleChangeLogSchema>;

export type CustomRole = typeof customRoles.$inferSelect;
export type InsertCustomRole = z.infer<typeof insertCustomRoleSchema>;

export type UserNote = typeof userNotes.$inferSelect;
export type InsertUserNote = z.infer<typeof insertUserNoteSchema>;

export type SubscriptionHistory = typeof subscriptionHistory.$inferSelect;
export type InsertSubscriptionHistory = z.infer<typeof insertSubscriptionHistorySchema>;

export type SystemLog = typeof systemLogs.$inferSelect;
export type InsertSystemLog = z.infer<typeof insertSystemLogSchema>;

export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = z.infer<typeof insertSystemSettingSchema>;

export type SystemAnnouncement = typeof systemAnnouncements.$inferSelect;
export type InsertSystemAnnouncement = z.infer<typeof insertSystemAnnouncementSchema>;

export type SystemNotification = typeof systemNotifications.$inferSelect;
export type InsertSystemNotification = z.infer<typeof insertSystemNotificationSchema>;

export type UserNotificationRead = typeof userNotificationReads.$inferSelect;
export type InsertUserNotificationRead = z.infer<typeof insertUserNotificationReadSchema>;

export type UserFavorite = typeof userFavorites.$inferSelect;
export type InsertUserFavorite = z.infer<typeof insertUserFavoriteSchema>;

export type EmergencyAlert = typeof emergencyAlerts.$inferSelect;
export type InsertEmergencyAlert = z.infer<typeof insertEmergencyAlertSchema>;

export type EmergencyAlertView = typeof emergencyAlertViews.$inferSelect;
export type InsertEmergencyAlertView = z.infer<typeof insertEmergencyAlertViewSchema>;

export type SheetsWebhookLog = typeof sheetsWebhookLogs.$inferSelect;
export type InsertSheetsWebhookLog = z.infer<typeof insertSheetsWebhookLogSchema>;

export type PriceDropNotification = typeof priceDropNotifications.$inferSelect;
export type InsertPriceDropNotification = z.infer<typeof insertPriceDropNotificationSchema>;

export type AppleProduct = typeof appleProducts.$inferSelect;
export type InsertAppleProduct = z.infer<typeof insertAppleProductSchema>;

export type ProductVariant = typeof productVariants.$inferSelect;
export type InsertProductVariant = z.infer<typeof insertProductVariantSchema>;

export type AvailableVariant = typeof availableVariants.$inferSelect;
export type InsertAvailableVariantSchema = z.infer<typeof insertAvailableVariantSchema>;

export type AdminActionLog = typeof adminActionLogs.$inferSelect;
export type InsertAdminActionLog = z.infer<typeof insertAdminActionLogSchema>;

// Centralized permission checking functions
export function hasAdminAccess(user: Partial<User>): boolean {
  // Admin access is granted if:
  // 1. role is 'admin' or 'superadmin' (regardless of isAdmin flag)
  // 2. OR isAdmin is true and subscriptionPlan is 'admin'
  return Boolean(
    user.role === 'admin' || 
    user.role === 'superadmin' || 
    (user.isAdmin && user.subscriptionPlan === 'admin')
  );
}

export function hasFullSystemAccess(user: Partial<User>): boolean {
  // Full system access only for superadmin role with isAdmin true
  return Boolean(user.isAdmin && user.role === 'superadmin');
}

export function canAccessAdminPanel(user: Partial<User>): boolean {
  // Admin panel access requires admin privileges
  return hasAdminAccess(user);
}

export interface ProductWithSupplier extends Product {
  supplier: Supplier;
}

export interface PaginatedProducts {
  products: ProductWithSupplier[];
  total: number;
  page: number;
  limit: number;
}

export interface UserWithDetails extends User {
  notes?: UserNote[];
  subscriptionHistory?: SubscriptionHistory[];
  lastLogin?: Date;
  sessionsCount?: number;
}

export interface DashboardStats {
  totalUsers: number;
  usersByPlan: { plan: string; count: number }[];
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  totalProducts: number;
  activeSuppliers: number;
  peakHours: { hour: number; count: number }[];
  topSearchedProducts: { model: string; searches: number }[];
  accessLast24h: number;
  accessLast7d: number;
  activeAlerts: number;
  recentLogs: SystemLog[];
}

// Tabela de avisos de feedback
export const feedbackAlerts = pgTable('feedback_alerts', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  feedbackType: varchar('feedback_type', { length: 50 }).notNull(),
  isRequired: boolean('is_required').default(false),
  startDate: timestamp('start_date', { withTimezone: true }).notNull(),
  endDate: timestamp('end_date', { withTimezone: true }).notNull(),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  isActive: boolean('is_active').default(true),
  targetAudience: varchar('target_audience', { length: 50 }).default('all'),
  delaySeconds: integer('delay_seconds').default(15)
});

// Tabela de respostas aos avisos
export const feedbackResponses = pgTable('feedback_responses', {
  id: serial('id').primaryKey(),
  alertId: integer('alert_id').references(() => feedbackAlerts.id, { onDelete: 'cascade' }),
  userId: integer('user_id').references(() => users.id),
  emojiResponse: varchar('emoji_response', { length: 10 }),
  textResponse: text('text_response'),
  respondedAt: timestamp('responded_at', { withTimezone: true }).defaultNow(),
  userEmail: varchar('user_email', { length: 255 })
});

// WhatsApp clicks tracking table
export const whatsAppClicks = pgTable("whatsapp_clicks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  productModel: text("product_model").notNull(),
  productBrand: text("product_brand"),
  productColor: text("product_color"),
  productStorage: text("product_storage"),
  productCategory: text("product_category"),
  supplierName: text("supplier_name").notNull(),
  whatsappNumber: text("whatsapp_number").notNull(),
  productPrice: decimal("product_price", { precision: 10, scale: 2 }),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  clickedAt: timestamp("clicked_at", { withTimezone: true }).defaultNow().notNull(),
});

export const supplierRatings = pgTable(
  'supplier_ratings',
  {
    id: serial('id').primaryKey(),
    supplierId: integer('supplier_id')
      .notNull()
      .references(() => suppliers.id, { onDelete: 'cascade' }),
    userId: varchar('user_id', { length: 255 }).notNull(),
    supplierName: text('supplier_name'),
    rating: integer('rating').notNull(),
    comment: text('comment'),
    isApproved: boolean('is_approved').default(false),
    approvedBy: integer('approved_by').references(() => users.id),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    supplierIdIdx: index('idx_supplier_ratings_supplier_id').on(table.supplierId),
    userIdIdx: index('idx_supplier_ratings_user_id').on(table.userId),
    approvalIdx: index('idx_supplier_ratings_approval').on(table.isApproved, table.createdAt),
    uniqueUserSupplier: uniqueIndex('idx_supplier_ratings_unique_user_supplier').on(table.userId, table.supplierId),
  })
);

// Event confirmations table
export const eventConfirmations = pgTable('event_confirmations', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  whatsapp: text('whatsapp').notNull(),
  accompanists: integer('accompanists').default(1).notNull(), // Número de acompanhantes (1 incluído, 2 se levar mais um)
  confirmedAt: timestamp('confirmed_at', { withTimezone: true }).defaultNow().notNull(),
  userId: integer('user_id').references(() => users.id),
  ipAddress: text('ip_address'),
  paymentStatus: text('payment_status').default('pending'), // 'pending', 'confirmed', 'failed'
  adminConfirmationStatus: text('admin_confirmation_status').default('pending'), // 'pending', 'confirmed', 'cancelled'
  confirmedByAdmin: integer('confirmed_by_admin').references(() => users.id),
  adminConfirmedAt: timestamp('admin_confirmed_at'),
  notes: text('notes'),
});

// Insert schemas for event confirmations
export const insertEventConfirmationSchema = createInsertSchema(eventConfirmations).omit({
  id: true,
  confirmedAt: true,
});

export type InsertEventConfirmation = z.infer<typeof insertEventConfirmationSchema>;
export type EventConfirmation = typeof eventConfirmations.$inferSelect;

// All tables are already exported individually above