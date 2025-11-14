import { Router } from 'express';
import { enhancedFeedbackAlertsController } from '../controllers/feedback-alerts-enhanced.controller';
import { authenticateAdmin } from '../middleware/admin-auth';
import { authenticateToken } from '../middleware/auth.js';
import { 
  validateCreateAlert, 
  validateSubmitResponse,
  validateFeedbackRateLimit,
  validateMessageSecurity 
} from '../middleware/feedback-validation';

const router = Router();

// Rotas para usuários autenticados - usando controller aprimorado
router.get('/active', authenticateToken, enhancedFeedbackAlertsController.getActiveAlertsForUser.bind(enhancedFeedbackAlertsController));
router.post('/respond', 
  authenticateToken,
  validateSubmitResponse,
  validateFeedbackRateLimit,
  validateMessageSecurity,
  enhancedFeedbackAlertsController.submitResponse.bind(enhancedFeedbackAlertsController)
);

// Rotas administrativas - usando controller aprimorado com validações completas
router.get('/admin/list', authenticateToken, authenticateAdmin, enhancedFeedbackAlertsController.getAllAlerts.bind(enhancedFeedbackAlertsController));
router.post('/admin/create', 
  authenticateToken,
  authenticateAdmin,
  validateCreateAlert,
  validateMessageSecurity,
  enhancedFeedbackAlertsController.createAlert.bind(enhancedFeedbackAlertsController)
);
router.get('/admin/:alertId/responses', authenticateToken, authenticateAdmin, enhancedFeedbackAlertsController.getAlertResponses.bind(enhancedFeedbackAlertsController));
router.delete('/admin/:alertId', authenticateToken, authenticateAdmin, enhancedFeedbackAlertsController.deleteAlert.bind(enhancedFeedbackAlertsController));
router.patch('/admin/:alertId/toggle', authenticateToken, authenticateAdmin, enhancedFeedbackAlertsController.toggleAlert.bind(enhancedFeedbackAlertsController));

export default router;