import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function PriceMonitoringPage() {
  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Monitoramento de Preços</CardTitle>
          <CardDescription>
            Configure alertas de preço para produtos específicos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Esta funcionalidade permite monitorar mudanças de preços em tempo real.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}