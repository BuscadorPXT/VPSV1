
import { Router } from 'express';
import { supplierRecommendationController } from '../controllers/supplier-recommendations.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/', authenticateToken, supplierRecommendationController.createRecommendation);

export default router;
