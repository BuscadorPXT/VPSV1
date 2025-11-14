
import { Router, Request, Response } from 'express';
import { verifyIdToken } from '../services/firebase-admin';
import { findUserByFirebaseUid } from '../services/user.service';

const router = Router();

// Diagnóstico de autenticação
router.post('/debug-auth', async (req: Request, res: Response) => {
  try {
    const { firebaseToken } = req.body;
    
    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      steps: []
    };

    // 1. Verificar se token foi enviado
    diagnostics.steps.push({
      step: 'token_received',
      success: !!firebaseToken,
      data: { tokenLength: firebaseToken?.length || 0 }
    });

    if (!firebaseToken) {
      return res.json({ success: false, diagnostics });
    }

    // 2. Verificar token no Firebase
    let decodedToken;
    try {
      decodedToken = await verifyIdToken(firebaseToken);
      diagnostics.steps.push({
        step: 'firebase_verification',
        success: true,
        data: { uid: decodedToken.uid, email: decodedToken.email }
      });
    } catch (error) {
      diagnostics.steps.push({
        step: 'firebase_verification',
        success: false,
        error: error.message
      });
      return res.json({ success: false, diagnostics });
    }

    // 3. Verificar usuário no banco
    try {
      const userData = await findUserByFirebaseUid(decodedToken.uid);
      diagnostics.steps.push({
        step: 'database_lookup',
        success: !!userData,
        data: userData ? {
          id: userData.id,
          email: userData.email,
          role: userData.role,
          isApproved: userData.isApproved,
          status: userData.status
        } : null
      });
    } catch (error) {
      diagnostics.steps.push({
        step: 'database_lookup',
        success: false,
        error: error.message
      });
    }

    res.json({ success: true, diagnostics });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message,
      diagnostics: { error: 'Unexpected error in diagnostics' }
    });
  }
});

export default router;
