import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { getUserSubscriptionDetails } from '../controllers/user-subscription.controller';

const router = Router();

// All routes require user authentication
router.use(authenticateToken);

// Get user's own subscription details
router.get('/my-subscription', getUserSubscriptionDetails);

export default router;