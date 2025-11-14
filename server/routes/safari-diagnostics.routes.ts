import { Router, Request, Response } from 'express';

const router = Router();

// Endpoint de diagnóstico específico para Safari
router.post('/safari-test', (req: Request, res: Response) => {
  try {
    const userAgent = req.headers['user-agent'] || '';
    const isSafari = userAgent.includes('Safari') && !userAgent.includes('Chrome');
    const cookies = req.cookies;
    const headers = req.headers;
    
    console.log('🔍 [Safari Diagnostics] Test endpoint called');
    console.log('🔍 [Safari Diagnostics] User-Agent:', userAgent);
    console.log('🔍 [Safari Diagnostics] Is Safari:', isSafari);
    console.log('🔍 [Safari Diagnostics] Cookies received:', Object.keys(cookies));
    console.log('🔍 [Safari Diagnostics] Headers:', Object.keys(headers));
    
    // Testar configuração de cookie
    res.cookie('safari-test-cookie', 'test-value', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 5 * 60 * 1000, // 5 minutos
      path: '/'
    });
    
    res.json({
      success: true,
      diagnostics: {
        userAgent,
        isSafari,
        cookiesReceived: Object.keys(cookies),
        headersReceived: Object.keys(headers),
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        domain: req.get('host'),
        origin: req.get('origin'),
        referer: req.get('referer')
      }
    });
    
  } catch (error) {
    console.error('❌ [Safari Diagnostics] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Diagnostic test failed',
      message: error.message
    });
  }
});

// Endpoint para testar localStorage do lado cliente
router.get('/safari-client-test', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Safari Compatibility Test</title>
    </head>
    <body>
        <h1>Safari Compatibility Test</h1>
        <div id="results"></div>
        <script>
            function runTests() {
                const results = [];
                
                // Test localStorage
                try {
                    localStorage.setItem('safari-test', 'value');
                    const value = localStorage.getItem('safari-test');
                    localStorage.removeItem('safari-test');
                    results.push('✅ localStorage: Working');
                } catch (e) {
                    results.push('❌ localStorage: ' + e.message);
                }
                
                // Test sessionStorage
                try {
                    sessionStorage.setItem('safari-test', 'value');
                    const value = sessionStorage.getItem('safari-test');
                    sessionStorage.removeItem('safari-test');
                    results.push('✅ sessionStorage: Working');
                } catch (e) {
                    results.push('❌ sessionStorage: ' + e.message);
                }
                
                // Test cookies
                try {
                    document.cookie = 'safari-client-test=value; path=/';
                    const cookies = document.cookie;
                    results.push('✅ Cookies: ' + (cookies.includes('safari-client-test') ? 'Working' : 'Not working'));
                } catch (e) {
                    results.push('❌ Cookies: ' + e.message);
                }
                
                // Test fetch with credentials
                fetch('/api/safari-diagnostics/safari-test', {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ test: true })
                })
                .then(response => response.json())
                .then(data => {
                    results.push('✅ Fetch with credentials: Working');
                    document.getElementById('results').innerHTML = results.join('<br>') + '<br><br><strong>Server Response:</strong><br>' + JSON.stringify(data, null, 2);
                })
                .catch(error => {
                    results.push('❌ Fetch with credentials: ' + error.message);
                    document.getElementById('results').innerHTML = results.join('<br>');
                });
            }
            
            // Run tests when page loads
            runTests();
        </script>
    </body>
    </html>
  `);
});

export { router as safariDiagnosticsRoutes };