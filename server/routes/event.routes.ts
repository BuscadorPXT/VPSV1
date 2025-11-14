import { Router, Request, Response } from 'express';
import { db } from '../db';
import { eventConfirmations, insertEventConfirmationSchema } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const router = Router();

// POST /api/event/confirm - Create new event confirmation
router.post('/confirm', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validationSchema = insertEventConfirmationSchema.extend({
      name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
      email: z.string().email('Email inválido'),
      whatsapp: z.string().min(10, 'WhatsApp inválido'),
      accompanists: z.number().min(2).max(3, 'Máximo 3 pessoas (você + 2 acompanhantes)'),
    });

    const data = validationSchema.parse(req.body);

    // Get IP address from request
    const ipAddress = req.ip || req.headers['x-forwarded-for'] as string || 'unknown';

    // Insert into database
    const [confirmation] = await db.insert(eventConfirmations).values({
      name: data.name,
      email: data.email,
      whatsapp: data.whatsapp,
      accompanists: data.accompanists,
      userId: data.userId,
      ipAddress,
      paymentStatus: data.paymentStatus || 'pending',
      notes: data.notes,
    }).returning();

    console.log('✅ Event confirmation created:', confirmation.id);

    res.status(201).json({
      success: true,
      message: 'Confirmação registrada com sucesso!',
      data: confirmation,
    });
  } catch (error: any) {
    console.error('❌ Error creating event confirmation:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Dados inválidos',
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erro ao registrar confirmação',
      error: error.message,
    });
  }
});

// GET /api/event/confirmations - Get all confirmations (admin only)
router.get('/confirmations', async (req: Request, res: Response) => {
  try {
    console.log('📋 [Event] GET /confirmations - Fetching all confirmations');
    
    const confirmations = await db.select().from(eventConfirmations);
    
    console.log(`✅ [Event] Found ${confirmations.length} confirmations`);

    res.json({
      success: true,
      data: confirmations,
      total: confirmations.length,
    });
  } catch (error: any) {
    console.error('❌ Error fetching confirmations:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar confirmações',
      error: error.message,
    });
  }
});

// GET /api/event/confirmation/:email - Check if email already confirmed
router.get('/confirmation/:email', async (req: Request, res: Response) => {
  try {
    const { email } = req.params;

    const [confirmation] = await db
      .select()
      .from(eventConfirmations)
      .where(eq(eventConfirmations.email, email))
      .limit(1);

    if (!confirmation) {
      return res.json({
        success: true,
        confirmed: false,
      });
    }

    res.json({
      success: true,
      confirmed: true,
      data: confirmation,
    });
  } catch (error: any) {
    console.error('❌ Error checking confirmation:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao verificar confirmação',
      error: error.message,
    });
  }
});

// PATCH /api/event/confirmation/:id/status - Update confirmation status (admin only)
router.patch('/confirmation/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    console.log(`📋 [Event] PATCH /confirmation/${id}/status - Status: ${status}`);

    if (!['confirmed', 'cancelled', 'pending'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status inválido. Use: confirmed, cancelled ou pending',
      });
    }

    // Get admin user ID from request (assuming auth middleware sets req.user)
    const adminUserId = (req as any).user?.id || null;

    const [updated] = await db
      .update(eventConfirmations)
      .set({
        adminConfirmationStatus: status,
        confirmedByAdmin: status === 'confirmed' ? adminUserId : null,
        adminConfirmedAt: status === 'confirmed' ? new Date() : null,
      })
      .where(eq(eventConfirmations.id, parseInt(id)))
      .returning();

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Confirmação não encontrada',
      });
    }

    console.log(`✅ [Event] Confirmation ${id} status updated to: ${status}`);

    res.json({
      success: true,
      message: `Status atualizado para ${status}`,
      data: updated,
    });
  } catch (error: any) {
    console.error('❌ Error updating confirmation status:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar status',
      error: error.message,
    });
  }
});

export const eventRoutes = router;
