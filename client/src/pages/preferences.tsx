

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/theme-provider';
import { Settings, Bell, Palette, Monitor } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DashboardLayout } from '@/components/dashboard-layout';

export default function PreferencesPage() {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  const handleSavePreferences = () => {
    toast({
      title: "Preferências salvas",
      description: "Suas configurações foram atualizadas com sucesso.",
    });
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Preferências
          </h1>
          <p className="text-muted-foreground mt-2">
            Configure suas preferências pessoais e configurações da aplicação
          </p>
        </div>

        <div className="grid gap-6">
          {/* Aparência */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Aparência
              </CardTitle>
              <CardDescription>
                Personalize a aparência da interface
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Tema da Interface</Label>
                  <p className="text-xs text-muted-foreground">
                    Escolha entre tema claro, escuro ou seguir o sistema
                  </p>
                </div>
                <Select value={theme} onValueChange={setTheme}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Selecionar tema" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                        Claro
                      </div>
                    </SelectItem>
                    <SelectItem value="dark">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-slate-800"></div>
                        Escuro
                      </div>
                    </SelectItem>
                    <SelectItem value="system">
                      <div className="flex items-center gap-2">
                        <Monitor className="w-3 h-3" />
                        Sistema
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Notificações */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notificações
              </CardTitle>
              <CardDescription>
                Configure como você deseja receber notificações
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Notificações de Preço</Label>
                  <p className="text-xs text-muted-foreground">
                    Receber alertas quando os preços mudarem
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Notificações por Email</Label>
                  <p className="text-xs text-muted-foreground">
                    Receber resumos por email
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Notificações Push</Label>
                  <p className="text-xs text-muted-foreground">
                    Receber notificações no navegador
                  </p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>

          {/* Dashboard */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Dashboard
              </CardTitle>
              <CardDescription>
                Configure a exibição do dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Exibir Preços em USD</Label>
                  <p className="text-xs text-muted-foreground">
                    Mostrar preços também em dólar americano
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Compactar Tabelas</Label>
                  <p className="text-xs text-muted-foreground">
                    Usar layout mais compacto nas tabelas
                  </p>
                </div>
                <Switch />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Auto-refresh</Label>
                  <p className="text-xs text-muted-foreground">
                    Atualizar dados automaticamente
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>

          {/* Botão Salvar */}
          <div className="flex justify-end">
            <Button onClick={handleSavePreferences} className="px-8">
              Salvar Preferências
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
