import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import productsRoutes from './routes/products.routes';
import ordersRoutes from './routes/orders.routes';
import authRoutes from './routes/auth.routes';
import usersRoutes from './routes/users.routes';
import categoriesRoutes from './routes/categories.routes';
import cartRoutes from './routes/cart.routes';
import { subscriptionManagementRoutes } from './subscription-management.routes';
import { userSubscriptionRoutes } from './user-subscription.routes';
import { supplierContactsRoutes } from './supplier-contacts.routes';
import { whatsappTrackingRoutes } from './whatsapp-tracking.routes';
import { searchAnalyticsRoutes } from './search-analytics.routes';
import { authDebugRoutes } from './auth-debug.routes';
import { sessionDiagnosticsRoutes } from './session-diagnostics.routes';
import { debugSupplierRoutes } from './debug-supplier.routes';
import debugProductsRoutes from './debug-products.routes';
import priceHistorySimpleRoutes from './price-history-simple.routes';
// Ratings routes removed - functionality disabled

dotenv.config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/products', productsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/cart', cartRoutes);
// app.use('/api/ratings', ratingsRoutes); // Ratings routes removed - functionality disabled

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ message: 'API is running' });
});

// Debug routes (development only)
  if (process.env.NODE_ENV === 'development') {
    app.use('/api/debug/auth', authDebugRoutes);
    app.use('/api/debug/sessions', sessionDiagnosticsRoutes);
    app.use('/api/debug/supplier', debugSupplierRoutes);
    app.use('/api/debug', debugProductsRoutes);
  }

// Supplier contacts
  app.use('/api/suppliers', supplierContactsRoutes);

  // WhatsApp tracking
  app.use('/api/whatsapp-tracking', whatsappTrackingRoutes);

  app.use('/api/price-history-simple', priceHistorySimpleRoutes);

export default app;