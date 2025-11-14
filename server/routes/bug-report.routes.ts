import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { bugReportController } from '../controllers/bug-report.controller';

const router = Router();

// Rota para submeter bug report (requer autenticação)
router.post('/submit', authenticateToken, bugReportController.submitBugReport.bind(bugReportController));

// Rota de teste para verificar conectividade com Discord
router.get('/test-webhook', authenticateToken, async (req, res) => {
  try {
    console.log('🧪 Testing Discord webhook...');

    const testMessage = {
      embeds: [{
        title: '🧪 Teste de Webhook - Sistema de Bug Reports',
        description: 'Este é um teste de conectividade com o Discord.',
        color: 0x0099ff,
        footer: {
          text: `Testado em: ${new Date().toLocaleString('pt-BR')}`,
        },
        timestamp: new Date().toISOString()
      }]
    };

    console.log('📤 Sending test message to Discord:', JSON.stringify(testMessage, null, 2));

    const response = await fetch(process.env.DISCORD_WEBHOOK_URL || '', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testMessage)
    });

    console.log('📡 Discord response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });

    const responseText = await response.text();
    console.log('📄 Response body:', responseText);

    res.json({ 
      success: response.ok, 
      status: response.status,
      message: response.ok ? 'Webhook funcionando!' : 'Erro no webhook',
      response: responseText
    });
  } catch (error) {
    console.error('❌ Test webhook error:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Rota de teste simples para conectividade
router.get('/test-simple', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 Simple connectivity test...');

    const response = await fetch(process.env.DISCORD_WEBHOOK_URL || '', {
      method: 'GET'
    });

    const responseText = await response.text();
    console.log('📊 Simple test result:', { status: response.status, body: responseText });

    res.json({ 
      success: response.ok, 
      status: response.status,
      response: responseText
    });
  } catch (error) {
    console.error('❌ Simple test error:', error);
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

export { router as bugReportRoutes };