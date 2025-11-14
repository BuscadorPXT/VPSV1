import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useUserProfile } from "@/hooks/use-user-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { User, Eye, EyeOff, Save, X, LogOut, Camera, ArrowLeft } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useTheme } from "@/components/theme-provider";
import { useLocation } from "wouter";
import { RainbowLoadingWave } from "../components/ui/rainbow-loading-wave";
import watermarkPattern from "@/assets/watermark-pattern.png";
import watermarkPatternDark from "@/assets/watermark-pattern-dark.png";


// Schema de validação para o perfil
const profileSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().min(1, "E-mail é obrigatório").email("E-mail inválido"),
  company: z.string().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().optional(),
  confirmPassword: z.string().optional(),
}).refine((data) => {
  if (data.newPassword && data.newPassword.length < 6) {
    return false;
  }
  return true;
}, {
  message: "Nova senha deve ter pelo menos 6 caracteres",
  path: ["newPassword"],
}).refine((data) => {
  if (data.newPassword && data.newPassword !== data.confirmPassword) {
    return false;
  }
  return true;
}, {
  message: "Confirmação de senha não confere",
  path: ["confirmPassword"],
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface UserProfile {
  id: number;
  email: string;
  name: string;
  company?: string;
  createdAt: string;
}

export default function Profile() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changePassword, setChangePassword] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ✅ OTIMIZAÇÃO: Usar hook centralizado para evitar queries duplicadas
  const { data: userProfile, isLoading } = useUserProfile();

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      email: "",
      company: "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Atualizar formulário quando os dados do perfil carregarem
  useEffect(() => {
    if (userProfile) {
      form.reset({
        name: userProfile.name || "",
        email: userProfile.email || "",
        company: userProfile.company || "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    }
  }, [userProfile, form]);

  // Carregar imagem do perfil do localStorage
  useEffect(() => {
    const savedImage = localStorage.getItem('profileImage');
    if (savedImage) {
      setProfileImage(savedImage);
    }
  }, []);

  // Função para lidar com mudança de imagem
  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Verificar tamanho do arquivo (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Erro",
          description: "A imagem deve ter no máximo 5MB",
          variant: "destructive",
        });
        return;
      }

      // Verificar tipo de arquivo
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Erro",
          description: "Por favor, selecione uma imagem válida",
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setProfileImage(result);
        localStorage.setItem('profileImage', result);
        toast({
          title: "Sucesso",
          description: "Imagem de perfil atualizada!",
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Função para remover imagem
  const removeProfileImage = () => {
    setProfileImage(null);
    localStorage.removeItem('profileImage');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    toast({
      title: "Sucesso",
      description: "Imagem de perfil removida!",
    });
  };

  // Função para voltar ao dashboard
  const handleBackToDashboard = () => {
    setLocation('/dashboard');
  };

  // Mutation para atualizar perfil
  const updateProfileMutation = useMutation({
    mutationFn: (data: Partial<ProfileFormData>) => 
      apiRequest('PUT', '/api/user/profile', data),
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Perfil atualizado com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/user/profile'] });
      setChangePassword(false);
      form.setValue("currentPassword", "");
      form.setValue("newPassword", "");
      form.setValue("confirmPassword", "");
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar perfil",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: ProfileFormData) => {
    const updateData: any = {
      name: data.name,
      email: data.email,
      company: data.company,
    };

    // Incluir dados de senha apenas se estiver alterando
    if (changePassword && data.newPassword) {
      updateData.currentPassword = data.currentPassword;
      updateData.newPassword = data.newPassword;
    }

    updateProfileMutation.mutate(updateData);
  };

  const handleCancel = () => {
    if (userProfile) {
      form.reset({
        name: userProfile.name || "",
        email: userProfile.email || "",
        company: userProfile.company || "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    }
    setChangePassword(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao fazer logout",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <RainbowLoadingWave text="Carregando perfil..." size="lg" />
      </div>
    );
  }

  if (false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="relative mx-auto mb-4 h-8 w-8">
            <div 
              className="rounded-full h-8 w-8 border-2 border-gray-200 border-t-blue-600 dark:border-gray-700 dark:border-t-blue-400"
              style={{ animation: 'spin 1s linear infinite' }}
            ></div>
          </div>
          <p className="text-muted-foreground" style={{ animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}>Carregando perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container watermark-pattern-main min-h-screen bg-background p-4 sm:p-6 lg:p-8 relative">
      {/* Content Layer */}
      <div className="relative z-10 max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={handleBackToDashboard}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Voltar ao Dashboard</span>
            </Button>
            <div className="h-12 w-12 bg-primary/10 rounded-xl flex items-center justify-center">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Meu Perfil</h1>
              <p className="text-muted-foreground">Gerencie suas informações pessoais e preferências</p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="flex items-center space-x-2"
          >
            <LogOut className="h-4 w-4" />
            <span>Sair</span>
          </Button>
        </div>

        {/* Formulário de Perfil */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Informações Pessoais</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Profile Image Upload */}
            <div className="flex flex-col items-center space-y-4 pb-6 border-b border-border">
              <div className="relative">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-muted flex items-center justify-center border-2 border-border">
                  {profileImage ? (
                    <img
                      src={profileImage}
                      alt="Foto do perfil"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="h-12 w-12 text-muted-foreground" />
                  )}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div>

              <div className="text-center space-y-2">
                <Label className="text-sm font-medium">Foto do Perfil</Label>
                <p className="text-xs text-muted-foreground">
                  Clique no ícone da câmera para alterar sua foto
                </p>
                <div className="flex items-center justify-center space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs"
                  >
                    Escolher arquivo
                  </Button>
                  {profileImage && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={removeProfileImage}
                      className="text-xs text-destructive hover:text-destructive"
                    >
                      Remover
                    </Button>
                  )}
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                {/* Nome */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Seu nome completo"
                          className="input-clean"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Email */}
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="seu@email.com"
                          className="input-clean"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Empresa */}
                <FormField
                  control={form.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Empresa (Opcional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Nome da sua empresa"
                          className="input-clean"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Alterar Senha */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="change-password" className="text-sm font-medium">
                      Alterar senha
                    </Label>
                    <Switch
                      id="change-password"
                      checked={changePassword}
                      onCheckedChange={setChangePassword}
                    />
                  </div>

                  {changePassword && (
                    <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                      {/* Senha Atual */}
                      <FormField
                        control={form.control}
                        name="currentPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Senha Atual</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type={showCurrentPassword ? "text" : "password"}
                                  placeholder="Sua senha atual"
                                  className="input-clean pr-10"
                                  {...field}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                >
                                  {showCurrentPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Nova Senha */}
                      <FormField
                        control={form.control}
                        name="newPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nova Senha</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type={showNewPassword ? "text" : "password"}
                                  placeholder="Nova senha (mínimo 6 caracteres)"
                                  className="input-clean pr-10"
                                  {...field}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                  onClick={() => setShowNewPassword(!showNewPassword)}
                                >
                                  {showNewPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Confirmar Senha */}
                      <FormField
                        control={form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirmar Nova Senha</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type={showConfirmPassword ? "text" : "password"}
                                  placeholder="Digite novamente a nova senha"
                                  className="input-clean pr-10"
                                  {...field}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                >
                                  {showConfirmPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </div>

                {/* Botões */}
                <div className="flex space-x-4 pt-4">
                  <Button
                    type="submit"
                    className="btn-primary flex items-center space-x-2"
                    disabled={updateProfileMutation.isPending}
                  >
                    <Save className="h-4 w-4" />
                    <span>
                      {updateProfileMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                    </span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    className="flex items-center space-x-2"
                  >
                    <X className="h-4 w-4" />
                    <span>Cancelar</span>
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Preferências */}
        <Card className="card-elevated">
          <CardHeader>
            <CardTitle>Preferências</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Tema */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Tema da Interface</Label>
                <p className="text-xs text-muted-foreground">
                  Escolha entre tema claro ou escuro
                </p>
              </div>
              <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Selecionar tema" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Claro</SelectItem>
                  <SelectItem value="dark">Escuro</SelectItem>
                  <SelectItem value="system">Sistema</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Informações da Conta */}
        {userProfile && (
          <Card className="card-elevated">
            <CardHeader>
              <CardTitle>Informações da Conta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">ID da Conta</Label>
                  <p className="font-medium">{userProfile.id}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Membro desde</Label>
                  <p className="font-medium">
                    {new Date(userProfile.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}


      </div>
    </div>
  );
}