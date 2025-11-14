import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { debugAuthHeaders } from '@/lib/debug-auth';
import { useAuth } from '@/hooks/use-auth';

export function ProfitMarginsTest() {
  // Sistema de margens bloqueado - funcionalidade em desenvolvimento
  const isSystemAvailable = false; // Sempre bloqueado
  
  if (!isSystemAvailable) {
    return (
      <Card className="border-2 border-red-200 bg-red-50 dark:bg-red-950/20">
        <CardContent className="p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="p-3 bg-red-100 dark:bg-red-900/50 rounded-full">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">
                Funcionalidade Bloqueada
              </h3>
              <p className="text-red-700 dark:text-red-300 max-w-md">
                O sistema de testes de margens está em desenvolvimento e não pode ser utilizado.
              </p>
              <div className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">
                  🔒 Acesso Restrito - Funcionalidade em Desenvolvimento
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { user } = useAuth();
  const [testResult, setTestResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testAuth = async () => {
    setLoading(true);
    setTestResult(null);
    
    try {
      console.log('🔧 Testing authentication...');
      
      // Test basic service first
      const basicResponse = await fetch('/api/profit-margins-test');
      const basicData = await basicResponse.json();
      console.log('✅ Basic service test:', basicData);
      
      // Test authenticated request
      const headers = await debugAuthHeaders();
      console.log('✅ Auth headers obtained:', Object.keys(headers));
      
      const authResponse = await fetch(`/api/profit-margins/categories/${user?.firebaseUid}`, {
        headers,
      });
      
      if (!authResponse.ok) {
        throw new Error(`${authResponse.status}: ${await authResponse.text()}`);
      }
      
      const authData = await authResponse.json();
      console.log('✅ Authenticated request success:', authData);
      
      setTestResult({
        success: true,
        basicService: basicData,
        authenticatedRequest: authData,
        user: user?.email
      });
      
    } catch (error) {
      console.error('❌ Test failed:', error);
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Profit Margins - Debug Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p><strong>Current User:</strong> {user?.email || 'Not logged in'}</p>
          <p><strong>Firebase UID:</strong> {user?.firebaseUid || 'None'}</p>
          <p><strong>Role:</strong> {user?.role || 'None'}</p>
        </div>
        
        <Button onClick={testAuth} disabled={loading || !user}>
          {loading ? 'Testing...' : 'Test Authentication & Service'}
        </Button>
        
        {testResult && (
          <Alert className={testResult.success ? 'border-green-500' : 'border-red-500'}>
            <AlertDescription>
              {testResult.success ? (
                <div>
                  <p className="font-semibold text-green-600">✅ Test Passed!</p>
                  <pre className="mt-2 text-sm bg-gray-100 p-2 rounded overflow-auto">
                    {JSON.stringify(testResult, null, 2)}
                  </pre>
                </div>
              ) : (
                <div>
                  <p className="font-semibold text-red-600">❌ Test Failed</p>
                  <p className="mt-1 text-sm">{testResult.error}</p>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}