import {
  users,
  suppliers,
  products,
  syncLogs,
  priceAlerts,
  notificationHistory,
  userSessions,
  securityLogs,
  userFavorites,
  type User,
  type InsertUser,
  type Supplier,
  type InsertSupplier,
  type Product,
  type InsertProduct,
  type SyncLog,
  type InsertSyncLog,
  type PriceAlert,
  type InsertPriceAlert,
  type NotificationHistory,
  type InsertNotificationHistory,
  type UserSession,
  type InsertUserSession,
  type SecurityLog,
  type InsertSecurityLog,
  type UserFavorite,
  type InsertUserFavorite,
  type ProductWithSupplier,
  type PaginatedProducts,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, isNull, lt, count, ne, or } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined>;
  getUserByStripeSubscriptionId(subscriptionId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;

  // Suppliers
  getSupplier(id: number): Promise<Supplier | undefined>;
  getSupplierByName(name: string): Promise<Supplier | undefined>;
  getAllSuppliers(): Promise<Supplier[]>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: number, supplier: Partial<InsertSupplier>): Promise<Supplier | undefined>;

  // Products
  getProduct(id: number): Promise<Product | undefined>;
  getAllProducts(page?: number, limit?: number, filters?: any): Promise<PaginatedProducts>;
  getProductsWithSuppliers(): Promise<ProductWithSupplier[]>;
  searchProducts(filters: {
    model?: string;
    storage?: string;
    color?: string;
    category?: string;
    capacity?: string;
    region?: string;
    page: number;
    limit: number;
  }): Promise<PaginatedProducts>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<boolean>;
  deleteAllProducts(): Promise<void>;
  deleteProductsByDates(dates: string[]): Promise<void>;
  bulkCreateProducts(products: InsertProduct[]): Promise<Product[]>;

  // Sync Logs
  createSyncLog(log: InsertSyncLog): Promise<SyncLog>;
  getLatestSyncLog(): Promise<SyncLog | undefined>;
  getSyncLogs(limit?: number): Promise<SyncLog[]>;

  // Filter Options
  getCategories(): Promise<string[]>;
  getCapacities(): Promise<string[]>;
  getRegions(): Promise<string[]>;
  getColors(): Promise<string[]>;
  getDates(): Promise<string[]>;
  getSuppliersFromProducts(date?: string): Promise<Supplier[]>;

  // Stats with filters
  countProducts(filters?: { date?: string }): Promise<number>;
  countAvailableProducts(filters?: { date?: string }): Promise<number>;
  countSuppliers(filters?: { date?: string }): Promise<number>;

  // Price Alerts
  createPriceAlert(alert: InsertPriceAlert): Promise<PriceAlert>;
  getUserPriceAlerts(userId: number): Promise<PriceAlert[]>;
  getActivePriceAlerts(): Promise<PriceAlert[]>;
  updatePriceAlert(id: number, alert: Partial<InsertPriceAlert>): Promise<PriceAlert | undefined>;
  deletePriceAlert(id: number): Promise<boolean>;
  markAlertAsNotified(id: number): Promise<void>;

  // Enhanced price alert methods
  updateAlertTriggerCount(id: number): Promise<void>;
  getUserActiveAlerts(userId: number): Promise<PriceAlert[]>;

  // Notification History
  createNotification(notification: InsertNotificationHistory): Promise<NotificationHistory>;
  getUserNotifications(userId: number, limit?: number): Promise<NotificationHistory[]>;
  markNotificationAsRead(id: number): Promise<void>;
  getUnreadNotificationCount(userId: number): Promise<number>;

  // User Sessions (Single Session Security)
  createUserSession(session: InsertUserSession): Promise<UserSession>;
  getUserSession(userId: number): Promise<UserSession | undefined>;
  getUserSessionByToken(sessionToken: string): Promise<UserSession | undefined>;
  updateUserSession(userId: number, session: Partial<InsertUserSession>): Promise<UserSession | undefined>;
  invalidateAllUserSessions(userId: number): Promise<void>;
  deactivateUserSession(userId: number): Promise<void>;
  isUserSessionValid(userId: number, sessionToken: string): Promise<boolean>;
  generateSessionToken(): string;

  // Security Logs
  createSecurityLog(log: InsertSecurityLog): Promise<SecurityLog>;
  getSecurityLogs(userId?: number, limit?: number): Promise<SecurityLog[]>;

  // User Favorites
  getUserFavorites(userId: number): Promise<UserFavorite[]>;
  getUserFavorite(userId: number, type: string, itemId: string): Promise<UserFavorite | undefined>;
  createUserFavorite(favorite: InsertUserFavorite): Promise<UserFavorite>;
  deleteUserFavorite(userId: number, type: string, itemId: string): Promise<boolean>;

  approveUser(userId: number, adminId?: number): Promise<any>;
  getPendingUsers(): Promise<User[]>;
  updateOrCreateSession(sessionData: {
    userId: number;
    sessionToken: string;
    ipAddress: string;
    userAgent: string;
    expiresAt: Date;
    isActive: boolean;
  }): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private suppliers: Map<number, Supplier>;
  private products: Map<number, Product>;
  private syncLogs: Map<number, SyncLog>;
  private currentUserId: number;
  private currentSupplierId: number;
  private currentProductId: number;
  private currentSyncLogId: number;

  constructor() {
    this.users = new Map();
    this.suppliers = new Map();
    this.products = new Map();
    this.syncLogs = new Map();
    this.currentUserId = 1;
    this.currentSupplierId = 1;
    this.currentProductId = 1;
    this.currentSyncLogId = 1;

    // Initialize with some default suppliers
    this.initializeDefaultData();
  }

  private initializeDefaultData() {
    const defaultSuppliers = [
      { name: 'TechMobile SP', active: true },
      { name: 'GadgetStore RJ', active: true },
      { name: 'Digital Plus MG', active: true },
    ];

    // Create suppliers first
    const supplierIds: number[] = [];
    defaultSuppliers.forEach(supplier => {
      const id = this.currentSupplierId++;
      const newSupplier: Supplier = {
        ...supplier,
        id,
        active: supplier.active,
        createdAt: new Date(),
      };
      this.suppliers.set(id, newSupplier);
      supplierIds.push(id);
    });

    // Create sample products to demonstrate the system
    const sampleProducts = [
      { model: 'iPhone 15', brand: 'Apple', storage: '128GB', color: 'Preto', price: '4299.00', supplierId: supplierIds[0], available: true },
      { model: 'iPhone 15', brand: 'Apple', storage: '128GB', color: 'Preto', price: '4199.00', supplierId: supplierIds[1], available: true },
      { model: 'iPhone 15', brand: 'Apple', storage: '128GB', color: 'Preto', price: '4350.00', supplierId: supplierIds[2], available: true },
      { model: 'iPhone 15', brand: 'Apple', storage: '256GB', color: 'Azul', price: '4799.00', supplierId: supplierIds[0], available: true },
      { model: 'iPhone 15', brand: 'Apple', storage: '256GB', color: 'Azul', price: '4699.00', supplierId: supplierIds[1], available: true },
      { model: 'Galaxy S24', brand: 'Samsung', storage: '128GB', color: 'Preto', price: '3299.00', supplierId: supplierIds[0], available: true },
      { model: 'Galaxy S24', brand: 'Samsung', storage: '128GB', color: 'Preto', price: '3199.00', supplierId: supplierIds[2], available: true },
      { model: 'Galaxy S24', brand: 'Samsung', storage: '256GB', color: 'Verde', price: '3699.00', supplierId: supplierIds[1], available: true },
      { model: 'Xiaomi 13', brand: 'Xiaomi', storage: '128GB', color: 'Branco', price: '1899.00', supplierId: supplierIds[0], available: true },
      { model: 'Xiaomi 13', brand: 'Xiaomi', storage: '128GB', color: 'Branco', price: '1799.00', supplierId: supplierIds[2], available: true },
    ];

    // Add products with lowest price calculation
    sampleProducts.forEach(productData => {
      const id = this.currentProductId++;
      const now = new Date();
      const product: Product = {
        ...productData,
        id,
        sku: `SKU${id.toString().padStart(4, '0')}`,
        isLowestPrice: false, // Will be calculated
        createdAt: now,
        updatedAt: now,
      };
      this.products.set(id, product);
    });

    // Calculate lowest prices
    this.calculateLowestPrices();

    // Add sample sync log
    const syncLog: SyncLog = {
      id: this.currentSyncLogId++,
      status: 'success',
      message: 'Sistema inicializado com dados de exemplo',
      recordsProcessed: sampleProducts.length,
      createdAt: new Date(),
    };
    this.syncLogs.set(syncLog.id, syncLog);
  }

  private calculateLowestPrices() {
    // Group products by model + storage + color combination
    const groupedProducts = new Map<string, Product[]>();

    Array.from(this.products.values()).forEach(product => {
      const key = `${product.model}-${product.storage}-${product.color}`.toLowerCase();
      if (!groupedProducts.has(key)) {
        groupedProducts.set(key, []);
      }
      groupedProducts.get(key)!.push(product);
    });

    // Mark lowest prices
    groupedProducts.forEach(productGroup => {
      // Find minimum price in group
      const minPrice = Math.min(...productGroup.map(p => parseFloat(p.price)));

      productGroup.forEach(product => {
        const updatedProduct = {
          ...product,
          isLowestPrice: parseFloat(product.price) === minPrice,
        };
        this.products.set(product.id, updatedProduct);
      });
    });
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.firebaseUid === firebaseUid);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = {
      ...insertUser,
      id,
      company: insertUser.company || null,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Suppliers
  async getSupplier(id: number): Promise<Supplier | undefined> {
    return this.suppliers.get(id);
  }

  async getSupplierByName(name: string): Promise<Supplier | undefined> {
    return Array.from(this.suppliers.values()).find(supplier => supplier.name === name);
  }

  async getAllSuppliers(): Promise<Supplier[]> {
    return Array.from(this.suppliers.values()).filter(supplier => supplier.active);
  }

  async createSupplier(insertSupplier: InsertSupplier): Promise<Supplier> {
    const id = this.currentSupplierId++;
    const supplier: Supplier = {
      ...insertSupplier,
      id,
      active: insertSupplier.active ?? true,
      createdAt: new Date(),
    };
    this.suppliers.set(id, supplier);
    return supplier;
  }

  async updateSupplier(id: number, supplierData: Partial<InsertSupplier>): Promise<Supplier | undefined> {
    const supplier = this.suppliers.get(id);
    if (!supplier) return undefined;

    const updatedSupplier = { ...supplier, ...supplierData };
    this.suppliers.set(id, updatedSupplier);
    return updatedSupplier;
  }

  // Products
  async getProduct(id: number): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async getAllProducts(page = 1, limit = 20, filters: any = {}): Promise<PaginatedProducts> {
    let filteredProducts = Array.from(this.products.values());

    // Apply filters
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filteredProducts = filteredProducts.filter(product =>
        product.model.toLowerCase().includes(searchTerm) ||
        product.brand.toLowerCase().includes(searchTerm)
      );
    }

    if (filters.storage) {
      filteredProducts = filteredProducts.filter(product =>
        product.storage === filters.storage
      );
    }

    if (filters.color) {
      filteredProducts = filteredProducts.filter(product =>
        product.color.toLowerCase() === filters.color.toLowerCase()
      );
    }

    if (filters.supplierId) {
      filteredProducts = filteredProducts.filter(product =>
        product.supplierId === parseInt(filters.supplierId)
      );
    }

    // Sort by updated date (newest first)
    filteredProducts.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    const total = filteredProducts.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

    // Get products with supplier information
    const productsWithSuppliers: ProductWithSupplier[] = paginatedProducts.map(product => {
      const supplier = this.suppliers.get(product.supplierId);
      return {
        ...product,
        supplier: supplier!,
      };
    });

    return {
      products: productsWithSuppliers,
      total,
      page,
      limit,
    };
  }

  async getProductsWithSuppliers(): Promise<ProductWithSupplier[]> {
    const allProducts = Array.from(this.products.values());
    return allProducts.map(product => {
      const supplier = this.suppliers.get(product.supplierId);
      return {
        ...product,
        supplier: supplier!,
      };
    });
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const id = this.currentProductId++;
    const now = new Date();
    const product: Product = {
      ...insertProduct,
      id,
      sku: insertProduct.sku || null,
      available: insertProduct.available ?? true,
      isLowestPrice: insertProduct.isLowestPrice ?? false,
      createdAt: now,
      updatedAt: now,
    };
    this.products.set(id, product);
    return product;
  }

  async updateProduct(id: number, productData: Partial<InsertProduct>): Promise<Product | undefined> {
    const product = this.products.get(id);
    if (!product) return undefined;

    const updatedProduct = {
      ...product,
      ...productData,
      updatedAt: new Date(),
    };
    this.products.set(id, updatedProduct);
    return updatedProduct;
  }

  async deleteProduct(id: number): Promise<boolean> {
    return this.products.delete(id);
  }

  async deleteAllProducts(): Promise<void> {
    this.products.clear();
    this.currentProductId = 1;
  }

  async deleteProductsByDates(dates: string[]): Promise<void> {
    for (const [id, product] of this.products.entries()) {
      if (product.date && dates.includes(product.date)) {
        this.products.delete(id);
      }
    }
  }

  async bulkCreateProducts(products: InsertProduct[]): Promise<Product[]> {
    const createdProducts: Product[] = [];

    for (const productData of products) {
      const product = await this.createProduct(productData);
      createdProducts.push(product);
    }

    return createdProducts;
  }

  // Sync Logs
  async createSyncLog(insertSyncLog: InsertSyncLog): Promise<SyncLog> {
    const id = this.currentSyncLogId++;
    const syncLog: SyncLog = {
      ...insertSyncLog,
      id,
      message: insertSyncLog.message || null,
      recordsProcessed: insertSyncLog.recordsProcessed || null,
      createdAt: new Date(),
    };
    this.syncLogs.set(id, syncLog);
    return syncLog;
  }

  async getLatestSyncLog(): Promise<SyncLog | undefined> {
    const logs = Array.from(this.syncLogs.values());
    return logs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  }

  async getSyncLogs(limit = 10): Promise<SyncLog[]> {
    const logs = Array.from(this.syncLogs.values());
    return logs
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async approveUser(userId: number, adminId?: number): Promise<any> {
    throw new Error("Method not implemented.");
  }
  async getPendingUsers(): Promise<User[]> {
    throw new Error("Method not implemented.");
  }
  async updateOrCreateSession(sessionData: {
    userId: number;
    sessionToken: string;
    ipAddress: string;
    userAgent: string;
    expiresAt: Date;
    isActive: boolean;
  }): Promise<void> {
    throw new Error("Method not implemented.");
  }
}

// Import Drizzle for PostgreSQL
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, desc, asc, and, like, sql } from 'drizzle-orm';

// PostgreSQL connection
const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString);
const db = drizzle(client);

// PostgreSQL Storage Implementation
export class PostgresStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      return user || null;
    } catch (error) {
      console.error('Get user by email error:', error);
      throw error;
    }
  }

  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.firebaseUid, firebaseUid)).limit(1);
    return result[0];
  }

  async getUserById(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByStripeSubscriptionId(subscriptionId: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.stripeSubscriptionId, subscriptionId)).limit(1);
    return result[0];
  }

  async createUser(userData: InsertUser): Promise<any> {
    console.log('💾 Storage.createUser called with:', userData);

    try {
      const [newUser] = await db.insert(users).values(userData).returning();
      console.log('✅ User created successfully in database:', {
        id: newUser.id,
        email: newUser.email,
        isApproved: newUser.isApproved,
        role: newUser.role
      });
      return newUser;
    } catch (error) {
      console.error('❌ Error creating user in database:', error);
      throw error;
    }
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    try {
      console.log(`Updating user ${id} with data:`, userData);

      // Validate user exists first
      const existingUser = await db.select().from(users).where(eq(users.id, id)).limit(1);
      if (existingUser.length === 0) {
        console.error(`User ${id} not found for update`);
        return null;
      }

      // Validate subscription plan values
      if (userData.subscriptionPlan && !['free', 'pro', 'business', 'admin', 'superadmin'].includes(userData.subscriptionPlan)) {
        throw new Error(`Invalid subscription plan: ${userData.subscriptionPlan}`);
      }

      // Validate role values
      if (userData.role && !['user', 'admin', 'superadmin'].includes(userData.role)) {
        throw new Error(`Invalid role: ${userData.role}`);
      }

      // Ensure consistency between role and isAdmin
      if (userData.role === 'admin' || userData.role === 'superadmin') {
        userData.isAdmin = true;
      } else if (userData.role === 'user') {
        userData.isAdmin = false;
      }

      const result = await db.update(users)
        .set({
          ...userData,
          updatedAt: new Date()
        })
        .where(eq(users.id, id))
        .returning();

      if (result.length === 0) {
        console.error(`No user updated for id ${id}`);
        return null;
      }

      console.log(`User ${id} updated successfully:`, result[0]);
      return result[0];
    } catch (error: any) {
      console.error('Error updating user:', error);
      throw new Error(`Failed to update user: ${error.message}`);
    }
  }

  async getSupplier(id: number): Promise<Supplier | undefined> {
    const result = await db.select().from(suppliers).where(eq(suppliers.id, id)).limit(1);
    return result[0];
  }

  async getSupplierByName(name: string): Promise<Supplier | undefined> {
    const result = await db.select().from(suppliers).where(eq(suppliers.name, name)).limit(1);
    return result[0];
  }

  async getAllSuppliers(): Promise<Supplier[]> {
    return await db.select().from(suppliers).where(eq(suppliers.active, true)).orderBy(asc(suppliers.name));
  }

  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    const result = await db.insert(suppliers).values({
      ...supplier,
      active: supplier.active ?? true,
    }).returning();
    return result[0];
  }

  async updateSupplier(id: number, supplier: Partial<InsertSupplier>): Promise<Supplier | undefined> {
    const result = await db.update(suppliers).set(supplier).where(eq(suppliers.id, id)).returning();
    return result[0];
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
    return result[0];
  }

  async getAllProducts(page = 1, limit = 20, filters: any = {}): Promise<PaginatedProducts> {
    let query = db.select({
      id: products.id,
      model: products.model,
      brand: products.brand,
      storage: products.storage,
      color: products.color,
      category: products.category,
      capacity: products.capacity,
      region: products.region,
      price: products.price,
      sku: products.sku,
      available: products.available,
      isLowestPrice: products.isLowestPrice,
      updatedAt: products.updatedAt,
      createdAt: products.createdAt,
      supplierId: products.supplierId,
      supplier: {
        id: suppliers.id,
        name: suppliers.name,
        active: suppliers.active,
        createdAt: suppliers.createdAt,
      },
    }).from(products).innerJoin(suppliers, eq(products.supplierId, suppliers.id));

    // Apply filters
    const conditions = [];
    if (filters.search) {
      conditions.push(
        sql`(${products.model} ILIKE ${`%${filters.search}%`} OR ${products.brand} ILIKE ${`%${filters.search}%`})`
      );
    }
    if (filters.storage && filters.storage !== 'all') {
      conditions.push(eq(products.storage, filters.storage));
    }
    if (filters.color && filters.color !== 'all') {
      conditions.push(sql`${products.color} ILIKE ${filters.color}`);
    }
    if (filters.category && filters.category !== 'all') {
      conditions.push(eq(products.category, filters.category));
    }
    if (filters.capacity && filters.capacity !== 'all') {
      conditions.push(eq(products.capacity, filters.capacity));
    }
    if (filters.region && filters.region !== 'all') {
      conditions.push(eq(products.region, filters.region));
    }
    if (filters.supplierId && filters.supplierId !== 'all') {
      conditions.push(eq(products.supplierId, parseInt(filters.supplierId)));
    }
    if (filters.supplierIds && filters.supplierIds.length > 0) {
      const supplierIdNumbers = filters.supplierIds.map(id => parseInt(id));
      conditions.push(sql`${products.supplierId} IN (${sql.join(supplierIdNumbers, sql`, `)})`);
    }
    if (filters.date && filters.date !== 'all') {
      conditions.push(eq(products.date, filters.date));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Get total count
    const totalResult = await db.select({ count: sql<number>`count(*)` })
      .from(products)
      .innerJoin(suppliers, eq(products.supplierId, suppliers.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const total = Number(totalResult[0].count);

    // Get paginated results
    const offset = (page - 1) * limit;
    const results = await query
      .orderBy(desc(products.updatedAt))
      .limit(limit)
      .offset(offset);

    const productsWithSuppliers: ProductWithSupplier[] = results.map(row => ({
      ...row,
      supplier: row.supplier,
    }));

    return {
      products: productsWithSuppliers,
      total,
      page,
      limit,
    };
  }

  async getProductsWithSuppliers(): Promise<ProductWithSupplier[]> {
    const results = await db.select({
      id: products.id,
      model: products.model,
      brand: products.brand,
      storage: products.storage,
      color: products.color,
      price: products.price,
      sku: products.sku,
      available: products.available,
      isLowestPrice: products.isLowestPrice,
      updatedAt: products.updatedAt,
      createdAt: products.createdAt,
      supplierId: products.supplierId,
      supplier: {
        id: suppliers.id,
        name: suppliers.name,
        active: suppliers.active,
        createdAt: suppliers.createdAt,
      },
    }).from(products).innerJoin(suppliers, eq(products.supplierId, suppliers.id));

    return results.map(row => ({
      ...row,
      supplier: row.supplier,
    }));
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const result = await db.insert(products).values({
      ...product,
      sku: product.sku || null,
      available: product.available ?? true,
      isLowestPrice: product.isLowestPrice ?? false,
    }).returning();
    return result[0];
  }

  async updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product | undefined> {
    const result = await db.update(products).set({
      ...product,
      updatedAt: new Date(),
    }).where(eq(products.id, id)).returning();
    return result[0];
  }

  async deleteProduct(id: number): Promise<boolean> {
    const result = await db.delete(products).where(eq(products.id, id)).returning();
    return result.length > 0;
  }

  async deleteAllProducts(): Promise<void> {
    await db.delete(products);
  }

  async deleteProductsByDates(dates: string[]): Promise<void> {
    if (dates.length === 0) return;
    await db.delete(products).where(sql`${products.date} IN (${sql.join(dates, sql`, `)})`);
  }

  async bulkCreateProducts(productsData: InsertProduct[]): Promise<Product[]> {
    if (productsData.length === 0) return [];

    // Usar abordagem mais simples para evitar stack overflow
    const results: Product[] = [];

    for (const product of productsData) {
      try {
        const cleanProduct = {
          model: product.model,
          brand: product.brand,
          storage: product.storage,
          color: product.color,
          category: product.category || null,
          capacity: product.capacity || null,
          region: product.region || null,
          date: product.date || null,
          supplierId: product.supplierId,
          price: product.price,
          sku: product.sku || null,
          available: product.available ?? true,
          isLowestPrice: product.isLowestPrice ?? false,
        };

        const result = await db.insert(products).values(cleanProduct).returning();
        if (result[0]) {
          results.push(result[0]);
        }
      } catch (error) {
        console.error('Error inserting product:', product.model, error);
        // Continue with next product instead of failing entire batch
      }
    }

    return results;
  }

  async createSyncLog(log: InsertSyncLog): Promise<SyncLog> {
    const result = await db.insert(syncLogs).values({
      ...log,
      message: log.message || null,
      recordsProcessed: log.recordsProcessed || null,
    }).returning();
    return result[0];
  }

  async getLatestSyncLog(): Promise<SyncLog | undefined> {
    const result = await db.select().from(syncLogs).orderBy(desc(syncLogs.createdAt)).limit(1);
    return result[0];
  }

  async getSyncLogs(limit = 10): Promise<SyncLog[]> {
    return await db.select().from(syncLogs).orderBy(desc(syncLogs.createdAt)).limit(limit);
  }

  async getCategories(): Promise<string[]> {
    const result = await db.selectDistinct({ category: products.category })
      .from(products)
      .where(sql`${products.category} IS NOT NULL`);
    return result.map(r => r.category).filter(Boolean) as string[];
  }

  async getCapacities(): Promise<string[]> {
    const result = await db.selectDistinct({ capacity: products.capacity })
      .from(products)
      .where(sql`${products.capacity} IS NOT NULL`);
    return result.map(r => r.capacity).filter(Boolean) as string[];
  }

  async getRegions(): Promise<string[]> {
    const result = await db.selectDistinct({ region: products.region })
      .from(products)
      .where(sql`${products.region} IS NOT NULL`);
    return result.map(r => r.region).filter(Boolean) as string[];
  }

  async getColors(): Promise<string[]> {
    const result = await db.selectDistinct({ color: products.color })
      .from(products)
      .where(sql`${products.color} IS NOT NULL AND ${products.color} != ''`)
      .orderBy(asc(products.color));
    return result.map(r => r.color).filter(Boolean) as string[];
  }

  async getDates(): Promise<string[]> {
    const result = await db.selectDistinct({ date: products.date })
      .from(products)
      .where(sql`${products.date} IS NOT NULL`)
      .orderBy(asc(products.date));
    return result.map(r => r.date).filter(Boolean) as string[];
  }

  async getSuppliersFromProducts(date?: string): Promise<Supplier[]> {
    let query = db
      .select({
        id: suppliers.id,
        name: suppliers.name,
        active: suppliers.active,
        createdAt: suppliers.createdAt,      })
      .from(products)
      .innerJoin(suppliers, eq(products.supplierId, suppliers.id));

    if (date && date !== 'all') {
      query = query.where(eq(products.date, date));
    }

    const result = await query
      .groupBy(suppliers.id, suppliers.name, suppliers.active, suppliers.createdAt)      .orderBy(asc(suppliers.name));

    return result;
  }

  async countProducts(filters?: { date?: string }): Promise<number> {
    let query = db.select({ count: sql<number>`count(*)` }).from(products);

    if (filters?.date && filters.date !== 'all') {
      query = query.where(eq(products.date, filters.date));
    }

    const result = await query;
    return Number(result[0].count);
  }

  async countAvailableProducts(filters?: { date?: string }): Promise<number> {
    let query = db.select({ count: sql<number>`count(*)` }).from(products);

    const conditions = [eq(products.available, true)];
    if (filters?.date && filters.date !== 'all') {
      conditions.push(eq(products.date, filters.date));
    }

    query = query.where(and(...conditions));

    const result = await query;
    return Number(result[0].count);
  }

  async countSuppliers(filters?: { date?: string }): Promise<number> {
    if (filters?.date && filters.date !== 'all') {
      // Count distinct suppliers that have products on the specified date
      const query = db
        .select({ count: sql<number>`count(DISTINCT ${products.supplierId})` })
        .from(products)
        .where(eq(products.date, filters.date));

      const result = await query;
      return Number(result[0].count);
    } else {
      // Count all active suppliers
      const query = db
        .select({ count: sql<number>`count(*)` })
        .from(suppliers)
        .where(eq(suppliers.active, true));

      const result = await query;
      return Number(result[0].count);
    }
  }

  async approveUser(userId: number, adminId?: number): Promise<any> {
    try {
      const [approvedUser] = await db
        .update(users)
        .set({
          isApproved: true,
          status: 'approved', // CRITICAL: Update status to approved
          approvedAt: new Date(),
          approvedBy: adminId || null,
          // Auto-promote to PRO plan
          subscriptionPlan: 'pro',
          role: 'pro',
          isSubscriptionActive: true,
          updatedAt: new Date(),
          lastActiveAt: new Date()
        })
        .where(eq(users.id, userId))
        .returning();

      if (!approvedUser) {
        throw new Error('User not found');
      }

      // Invalidate any existing sessions to force re-authentication with new permissions
      await db.update(userSessions)
        .set({ isActive: false })
        .where(eq(userSessions.userId, userId));

      console.log(`✅ User approved: ${approvedUser.email} - Status: ${approvedUser.status}, Role: ${approvedUser.role}`);

      // Log admin action
      if (adminId) {
        await this.createAdminActionLog({
          adminId,
          action: 'user_approval',
          targetUserId: userId,
          details: `Approved user ${approvedUser.email} and promoted to PRO`
        });
      }

      return approvedUser;
    } catch (error) {
      console.error('Error approving user:', error);
      throw error;
    }
  }

  async getPendingUsers() {
    const pendingUsers = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.isApproved, false),
          eq(users.status, 'pending_approval'),
          or(
            eq(users.role, 'user'),
            eq(users.isAdmin, false)
          )
        )
      )
      .orderBy(desc(users.createdAt));

    console.log(`🔍 Storage.getPendingUsers found ${pendingUsers.length} users`);
    return pendingUsers;
  }

  // Price Alerts
  async createPriceAlert(alert: InsertPriceAlert): Promise<PriceAlert> {
    const result = await db.insert(priceAlerts).values(alert).returning();
    return result[0];
  }

  async getUserPriceAlerts(userId: number): Promise<PriceAlert[]> {
    return await db.select().from(priceAlerts).where(eq(priceAlerts.userId, userId)).orderBy(desc(priceAlerts.createdAt));
  }

  async getActivePriceAlerts(): Promise<PriceAlert[]> {
    return await db.select().from(priceAlerts).where(and(eq(priceAlerts.isActive, true), eq(priceAlerts.isNotified, false)));
  }

  async updatePriceAlert(id: number, alert: Partial<InsertPriceAlert>): Promise<PriceAlert | undefined> {
    const result = await db.update(priceAlerts).set(alert).where(eq(priceAlerts.id, id)).returning();
    return result[0];
  }

  async deletePriceAlert(id: number): Promise<boolean> {
    const result = await db.delete(priceAlerts).where(eq(priceAlerts.id, id));
    return result.rowCount > 0;
  }

  async markAlertAsNotified(id: number): Promise<void> {
    await db.update(priceAlerts).set({ 
      isNotified: true, 
      notifiedAt: new Date() 
    }).where(eq(priceAlerts.id, id));
  }

  async updateAlertTriggerCount(id: number): Promise<void> {
    await db.update(priceAlerts)
      .set({ 
        triggerCount: sql`${priceAlerts.triggerCount} + 1`,
        lastTriggeredAt: new Date()
      })
      .where(eq(priceAlerts.id, id));
  }

  async getUserActiveAlerts(userId: number): Promise<PriceAlert[]> {
    const alerts = await db.select()
      .from(priceAlerts)
      .where(and(
        eq(priceAlerts.userId, userId),
        eq(priceAlerts.isActive, true),
        lt(priceAlerts.triggerCount, priceAlerts.maxTriggers)
      ))
      .orderBy(desc(priceAlerts.createdAt));

    return alerts;
  }

  async createNotification(notification: InsertNotificationHistory): Promise<NotificationHistory> {
    const [created] = await db.insert(notificationHistory)
      .values(notification)
      .returning();
    return created;
  }

  async getUserNotifications(userId: number, limit = 50): Promise<NotificationHistory[]> {
    const notifications = await db.select()
      .from(notificationHistory)
      .where(eq(notificationHistory.userId, userId))
      .orderBy(desc(notificationHistory.createdAt))
      .limit(limit);

    return notifications;
  }

  async markNotificationAsRead(id: number): Promise<void> {
    await db.update(notificationHistory)
      .set({ 
        status: 'read',
        readAt: new Date() 
      })
      .where(eq(notificationHistory.id, id));
  }

  async getUnreadNotificationCount(userId: number): Promise<number> {
    const [result] = await db.select({ count: count() })
      .from(notificationHistory)
      .where(and(
        eq(notificationHistory.userId, userId),
        ne(notificationHistory.status, 'read')
      ));

    return result.count;
  }

  // User Sessions (Single Session Security)
  generateSessionToken(): string {
    // Gera um token único de 32 caracteres
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 32; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token + '_' + Date.now(); // Adiciona timestamp para garantir unicidade
  }

  async createUserSession(session: InsertUserSession): Promise<UserSession> {
    // Usar UPSERT para evitar erro de chave duplicada
    const [newSession] = await db.insert(userSessions)
      .values({
        ...session,
        isActive: true,
        lastActivity: new Date()
      })
      .onConflictDoUpdate({
        target: userSessions.userId,
        set: {
          sessionToken: session.sessionToken,
          ipAddress: session.ipAddress,
          userAgent: session.userAgent,
          isActive: true,
          loginAttempts: 0,
          lastActivity: new Date(),
          createdAt: new Date()
        }
      })
      .returning();

    console.log(`🔐 Sessão única atualizada para usuário ${session.userId} - Token: ${session.sessionToken.substring(0, 8)}...`);
    return newSession;
  }

  async getUserSession(userId: number): Promise<UserSession | undefined> {
    const [session] = await db.select()
      .from(userSessions)
      .where(eq(userSessions.userId, userId))
      .limit(1);
    return session;
  }

  async getUserSessionByToken(sessionToken: string): Promise<UserSession | undefined> {
    const [session] = await db.select()
      .from(userSessions)
      .where(eq(userSessions.sessionToken, sessionToken))
      .limit(1);
    return session;
  }

  async updateUserSession(userId: number, session: Partial<InsertUserSession>): Promise<UserSession | undefined> {
    const [updatedSession] = await db.update(userSessions)
      .set(session)
      .where(eq(userSessions.userId, userId))
      .returning();
    return updatedSession;
  }

  async deactivateUserSession(userId: number): Promise<void> {
    await db.update(userSessions)
      .set({ isActive: false })
      .where(eq(userSessions.userId, userId));
  }

  async invalidateAllUserSessions(userId: number): Promise<void> {
    // Delete all sessions for the user to force complete logout
    await db.delete(userSessions)
      .where(eq(userSessions.userId, userId));

    console.log(`🔒 All sessions invalidated for user ${userId}`);
  }

  async isUserSessionValid(userId: number, sessionToken: string): Promise<boolean> {
    const session = await this.getUserSessionByToken(sessionToken);
    if (!session || !session.isActive || session.userId !== userId) {
      return false;
    }

    // Atualiza última atividade
    await this.updateUserSession(userId, { lastActivity: new Date() });
    return true;
  }

  async getActiveSession(userId: number, sessionToken: string) {
    try {
      const [session] = await db
        .select()
        .from(userSessions)
        .where(
          and(
            eq(userSessions.userId, userId),
            eq(userSessions.sessionToken, sessionToken),
            eq(userSessions.isActive, true)
          )
        )
        .limit(1);

      if (!session || session.expiresAt < new Date()) {
        return null;
      }

      return session;
    } catch (error) {
      console.error('Error getting active session:', error);
      return null;
    }
  }

  async updateSessionActivity(sessionToken: string) {
    try {
      await db
        .update(userSessions)
        .set({ 
          lastActivity: new Date()
        })
        .where(eq(userSessions.sessionToken, sessionToken));
    } catch (error) {
      console.error('Error updating session activity:', error);
      throw error;
    }
  }

  // Security Logs
  async createSecurityLog(log: InsertSecurityLog): Promise<SecurityLog> {
    const [newLog] = await db.insert(securityLogs).values(log).returning();
    return newLog;
  }

  async getSecurityLogs(userId?: number, limit = 50): Promise<SecurityLog[]> {
    let query = db.select().from(securityLogs);

    if (userId) {
      query = query.where(eq(securityLogs.userId, userId));
    }

    const logs = await query
      .orderBy(desc(securityLogs.createdAt))
      .limit(limit);

    return logs;
  }

  async getUserFavorites(userId: number): Promise<UserFavorite[]> {
    const favorites = await db.select()
      .from(userFavorites)
      .where(eq(userFavorites.userId, userId))
      .orderBy(desc(userFavorites.createdAt));

    return favorites;
  }

  async getUserFavorite(userId: number, type: string, itemId: string): Promise<UserFavorite | undefined> {
    const favorite = await db.select()
      .from(userFavorites)
      .where(and(
        eq(userFavorites.userId, userId),
        eq(userFavorites.type, type),
        eq(userFavorites.itemId, itemId)
      ))
      .limit(1);

    return favorite[0];
  }

  async createUserFavorite(favorite: InsertUserFavorite): Promise<UserFavorite> {
    const result = await db.insert(userFavorites)
      .values(favorite)
      .returning();

    return result[0];
  }

  async deleteUserFavorite(userId: number, type: string, itemId: string): Promise<boolean> {
    try {
      const result = await db.delete(userFavorites)
        .where(and(
          eq(userFavorites.userId, userId),
          eq(userFavorites.type, type),
          eq(userFavorites.itemId, itemId)
        ));

      return true; // If no error thrown, deletion was successful
    } catch (error) {
      console.error('Error deleting favorite:', error);
      return false;
    }
  }

  async updateOrCreateSession(sessionData: {
    userId: number;
    sessionToken: string;
    ipAddress: string;
    userAgent: string;
    expiresAt: Date;
    isActive: boolean;
  }): Promise<void> {
    const existingSession = await db.select()
      .from(userSessions)
      .where(eq(userSessions.sessionToken, sessionData.sessionToken))
      .limit(1);

    const currentTime = new Date();

    if (existingSession.length > 0) {
      // Atualizar sessão existente
      await db.update(userSessions)
        .set({
          lastActivity: currentTime,
          ipAddress: sessionData.ipAddress,
          userAgent: sessionData.userAgent,
          isActive: sessionData.isActive
        })
        .where(eq(userSessions.sessionToken, sessionData.sessionToken));

      console.log(`🔄 Sessão atualizada para usuário ${sessionData.userId} - Token: ${sessionData.sessionToken.substring(0, 20)}...`);
    } else {
      // Criar nova sessão
      await db.insert(userSessions).values({
        userId: sessionData.userId,
        sessionToken: sessionData.sessionToken,
        ipAddress: sessionData.ipAddress,
        userAgent: sessionData.userAgent,
        expiresAt: sessionData.expiresAt,
        isActive: sessionData.isActive,
        lastActivity: currentTime,
        createdAt: currentTime
      });

      console.log(`✨ Nova sessão criada para usuário ${sessionData.userId} - Token: ${sessionData.sessionToken.substring(0, 20)}...`);
      console.log(`📍 IP: ${sessionData.ipAddress} | Expira: ${sessionData.expiresAt.toISOString()}`);
    }
  }

  async createAdminActionLog(log: any): Promise<any> {
    // Implement the createAdminActionLog method here
    // This is a placeholder, replace with your actual implementation
    console.log('Admin Action Log:', log);
  }

  
}

export const storage = new PostgresStorage();