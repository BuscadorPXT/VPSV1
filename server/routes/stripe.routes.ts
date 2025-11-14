// Rotas de pagamentos Stripe - checkout, webhooks e gerenciamento de assinaturas
import { Router } from 'express';
import type { Request, Response } from 'express';
import Stripe from 'stripe';

const router = Router();

// Configuração do Stripe
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
let stripe: Stripe | null = null;

if (STRIPE_SECRET_KEY && STRIPE_SECRET_KEY.startsWith('sk_')) {
  stripe = new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: "2025-05-28.basil",
  });
  console.log('✅ Stripe initialized successfully');
} else {
  console.warn('⚠️ Stripe not configured properly - subscription features disabled');
}

// Criar sessão de checkout
router.post('/checkout-session', async (req: Request, res: Response) => {
  try {
    if (!stripe) {
      return res.status(503).json({ 
        error: 'Serviço de pagamento não disponível',
        message: 'Stripe não está configurado' 
      });
    }

    const { plan } = req.body;
    
    if (!plan || !['monthly', 'annual'].includes(plan)) {
      return res.status(400).json({ error: 'Plano inválido' });
    }

    // Preços em centavos (Stripe usa centavos)
    const prices = {
      monthly: 28990, // R$ 289,90
      annual: 318888   // R$ 3.188,88 (R$ 265,74/mês)
    };

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: {
              name: plan === 'monthly' ? 'Buscador PXT - Plano Mensal' : 'Buscador PXT - Plano Anual',
              description: plan === 'monthly' 
                ? 'Acesso completo aos preços de produtos Apple'
                : 'Acesso completo aos preços de produtos Apple - Desconto anual',
            },
            unit_amount: prices[plan as keyof typeof prices],
            recurring: {
              interval: plan === 'monthly' ? 'month' : 'year',
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${req.headers.origin}/pagamento-sucesso?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/`,
      metadata: {
        plan: plan,
      },
    });

    console.log('✅ Stripe Checkout Session criada:', session.id);
    res.json({ url: session.url });
  } catch (error: any) {
    console.error('❌ Erro no Stripe Checkout:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: error.message 
    });
  }
});

// Webhook do Stripe para eventos de pagamento
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    if (!stripe) {
      return res.status(503).json({ error: 'Stripe não configurado' });
    }

    const sig = req.headers['stripe-signature'] as string;
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!endpointSecret) {
      console.error('❌ STRIPE_WEBHOOK_SECRET não configurado');
      return res.status(400).json({ error: 'Webhook secret não configurado' });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err: any) {
      console.error('❌ Erro na verificação do webhook:', err.message);
      return res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
    }

    // Processar diferentes tipos de eventos
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('✅ Checkout session completed:', session.id);
        
        // Aqui você pode atualizar o banco de dados com a nova assinatura
        // Por exemplo, marcar o usuário como pago, atualizar plano, etc.
        
        break;

      case 'customer.subscription.created':
        const subscription = event.data.object as Stripe.Subscription;
        console.log('✅ Subscription created:', subscription.id);
        break;

      case 'customer.subscription.updated':
        const updatedSubscription = event.data.object as Stripe.Subscription;
        console.log('🔄 Subscription updated:', updatedSubscription.id);
        break;

      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object as Stripe.Subscription;
        console.log('❌ Subscription canceled:', deletedSubscription.id);
        break;

      case 'invoice.payment_succeeded':
        const invoice = event.data.object as Stripe.Invoice;
        console.log('💰 Payment succeeded:', invoice.id);
        break;

      case 'invoice.payment_failed':
        const failedInvoice = event.data.object as Stripe.Invoice;
        console.log('❌ Payment failed:', failedInvoice.id);
        break;

      default:
        console.log(`⚠️ Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error('❌ Erro no webhook do Stripe:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Verificar status de uma sessão de checkout
router.get('/checkout-session/:sessionId', async (req: Request, res: Response) => {
  try {
    if (!stripe) {
      return res.status(503).json({ error: 'Stripe não configurado' });
    }

    const { sessionId } = req.params;

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    res.json({
      status: session.payment_status,
      customer_email: session.customer_details?.email,
      metadata: session.metadata
    });
  } catch (error: any) {
    console.error('❌ Erro ao recuperar sessão:', error);
    res.status(500).json({ error: 'Erro ao verificar sessão' });
  }
});

// Criar portal do cliente para gerenciar assinatura
router.post('/customer-portal', async (req: Request, res: Response) => {
  try {
    if (!stripe) {
      return res.status(503).json({ error: 'Stripe não configurado' });
    }

    const { customerId } = req.body;

    if (!customerId) {
      return res.status(400).json({ error: 'Customer ID é obrigatório' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${req.headers.origin}/dashboard`,
    });

    res.json({ url: session.url });
  } catch (error: any) {
    console.error('❌ Erro ao criar portal do cliente:', error);
    res.status(500).json({ error: 'Erro ao criar portal' });
  }
});

export { router as stripeRoutes };