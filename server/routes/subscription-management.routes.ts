import { Router } from 'express';
import { authenticateAdmin } from '../middleware/admin-auth';
import { 
  getAllSubscriptions, 
  getSubscriptionDetails, 
  updateSubscriptionData, 
  markPendingPayment, 
  activateSubscription, 
  suspendSubscription, 
  extendTrial, 
  getSubscriptionAnalytics 
} from '../controllers/subscription-management.controller';

const router = Router();

// All routes require admin authentication
router.use(authenticateAdmin);

// Get all subscriptions with pagination and filters
router.get('/subscriptions', getAllSubscriptions);

// Get specific subscription details
router.get('/subscriptions/:userId', getSubscriptionDetails);

// Update subscription data
router.patch('/subscriptions/:userId/update', updateSubscriptionData);

// Mark subscription as pending payment
router.patch('/subscriptions/:userId/mark-pending', markPendingPayment);

// Activate subscription
router.patch('/subscriptions/:userId/activate', activateSubscription);

// Suspend subscription
router.patch('/subscriptions/:userId/suspend', suspendSubscription);

// Extend trial period
router.patch('/subscriptions/:userId/extend-trial', extendTrial);

// Get subscription analytics
router.get('/analytics', getSubscriptionAnalytics);

export default router;