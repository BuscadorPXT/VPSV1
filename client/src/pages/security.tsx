import { SecurityStatus } from '@/features/auth/components/SecurityStatus';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Info } from 'lucide-react';

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Segurança da Conta</h1>
          <p className="text-muted-foreground">
            Gerencie a segurança da sua sessão e monitore atividades
          </p>
        </div>

        {/* Informações sobre a Segurança por IP */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Sistema de Segurança por IP Único
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium">Como funciona:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Apenas 1 IP por usuário pode estar ativo por vez</li>
                  <li>• Login de outro IP desconecta a sessão anterior</li>
                  <li>• Tolerância para mudanças menores de IP (4G dinâmico)</li>
                  <li>• Logs completos de todas as atividades</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium">Funcionalidades:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Verificação automática a cada requisição</li>
                  <li>• Logout forçado de outros dispositivos</li>
                  <li>• Monitoramento em tempo real</li>
                  <li>• Auditoria completa de acessos</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status de Segurança */}
        <SecurityStatus />
      </div>
    </div>
  );
}