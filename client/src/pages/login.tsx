import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield } from "lucide-react";
import logoBranca from "/logo_natal_branca.png";

export default function Login() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [loginLoading, setLoginLoading] = useState(false);
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [, setLocation] = useLocation();
  const hasRedirected = useRef(false);

  const urlParams = new URLSearchParams(window.location.search);
  const logoutReason = urlParams.get('reason');

  useEffect(() => {
    if (user && !loading && !hasRedirected.current) {
      hasRedirected.current = true;
      console.log('User authenticated, redirecting...');
      if (user.isApproved) {
        setLocation('/dashboard');
      } else {
        setLocation('/pending-approval');
      }
    }
  }, [user, loading, setLocation]);

  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
  });

  const [registerForm, setRegisterForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    company: '',
    whatsapp: '',
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loginLoading || loading) return;

    if (!loginForm.email || !loginForm.password) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos",
        variant: "destructive",
      });
      return;
    }

    setLoginLoading(true);

    try {
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      const { auth } = await import('@/lib/firebase');

      console.log('🔐 Attempting Firebase login...');

      const userCredential = await signInWithEmailAndPassword(auth, loginForm.email, loginForm.password);

      console.log('✅ Firebase login successful');

      toast({
        title: "Sucesso",
        description: "Redirecionando...",
      });

      hasRedirected.current = true;
      
      const response = await fetch('/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${await userCredential.user.getIdToken()}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.profile?.isApproved) {
          setLocation('/dashboard');
        } else {
          setLocation('/pending-approval');
        }
      } else {
        setLocation('/dashboard');
      }

    } catch (error: any) {
      console.error('❌ Login error:', error);

      let errorMessage = "Credenciais inválidas";

      if (error.code) {
        switch (error.code) {
          case 'auth/user-not-found':
          case 'auth/wrong-password':
          case 'auth/invalid-credential':
            errorMessage = "Email ou senha incorretos";
            break;
          case 'auth/too-many-requests':
            errorMessage = "Muitas tentativas. Tente novamente mais tarde";
            break;
          case 'auth/user-disabled':
            errorMessage = "Conta desativada. Entre em contato com o suporte";
            break;
          case 'auth/network-request-failed':
            errorMessage = "Erro de conexão. Verifique sua internet";
            break;
          case 'auth/invalid-email':
            errorMessage = "Formato de email inválido";
            break;
          default:
            errorMessage = "Erro durante o login";
        }
      }

      toast({
        title: "Erro no Login",
        description: errorMessage,
        variant: "destructive",
      });
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!registerForm.name || !registerForm.email || !registerForm.password ||
        !registerForm.confirmPassword || !registerForm.company || !registerForm.whatsapp) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    if (registerForm.password !== registerForm.confirmPassword) {
      toast({
        title: "Senhas não coincidem",
        description: "A senha e confirmação devem ser iguais.",
        variant: "destructive",
      });
      return;
    }

    if (registerForm.password.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    setLoginLoading(true);

    try {
      const { createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth');
      const { auth } = await import('@/lib/firebase');

      const userCredential = await createUserWithEmailAndPassword(auth, registerForm.email, registerForm.password);

      await updateProfile(userCredential.user, {
        displayName: registerForm.name
      });

      const firebaseToken = await userCredential.user.getIdToken();

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firebaseToken,
          name: registerForm.name,
          company: registerForm.company,
          whatsapp: registerForm.whatsapp,
          email: registerForm.email
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Erro durante o registro');
      }

      toast({
        title: "Cadastro realizado!",
        description: "Sua conta foi criada. Aguardando aprovação...",
      });

      setTimeout(() => {
        setLocation('/pending-approval');
      }, 2000);

    } catch (error: any) {
      console.error('❌ Registration error:', error);

      if (error.code) {
        switch (error.code) {
          case 'auth/email-already-in-use':
            toast({
              title: "Email já cadastrado",
              description: "Este email já está sendo usado.",
              variant: "destructive",
            });
            break;
          case 'auth/weak-password':
            toast({
              title: "Senha muito fraca",
              description: "Escolha uma senha mais forte.",
              variant: "destructive",
            });
            break;
          default:
            toast({
              title: "Erro no Cadastro",
              description: error.message || "Erro inesperado.",
              variant: "destructive",
            });
        }
      } else {
        toast({
          title: "Erro no Cadastro",
          description: error.message || "Erro inesperado.",
          variant: "destructive",
        });
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!forgotPasswordEmail) {
      toast({
        title: "Email obrigatório",
        description: "Por favor, digite seu email",
        variant: "destructive",
      });
      return;
    }

    setForgotPasswordLoading(true);

    try {
      const { sendPasswordResetEmail } = await import('firebase/auth');
      const { auth } = await import('@/lib/firebase');

      await sendPasswordResetEmail(auth, forgotPasswordEmail);

      toast({
        title: "Email enviado!",
        description: "Verifique sua caixa de entrada",
      });

      setForgotPasswordOpen(false);
      setForgotPasswordEmail('');
    } catch (error: any) {
      let errorMessage = "Erro ao enviar email";

      if (error.code === 'auth/user-not-found') {
        errorMessage = "Email não encontrado";
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = "Email inválido";
      }

      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  return (
    <div className="bg-gray-950 flex items-center justify-center min-h-screen p-4 font-sans">
      <div className="w-full relative max-w-md">
        <div className="absolute inset-0 h-full w-full bg-gradient-to-r from-white to-white transform scale-[0.80] rounded-full blur-3xl opacity-60"></div>
        
        <div className="relative shadow-xl bg-gray-900 border border-gray-800 px-8 py-10 h-full overflow-hidden rounded-2xl flex flex-col justify-start items-center">
          {logoutReason === 'new_session' && (
            <Alert className="mb-6 border-amber-400/50 bg-amber-500/20">
              <Shield className="h-4 w-4 text-amber-300" />
              <AlertDescription className="text-amber-100">
                <div className="font-medium">Sessão Única Ativa</div>
                <div className="text-sm">Sua sessão anterior foi encerrada. Faça login novamente.</div>
              </AlertDescription>
            </Alert>
          )}

          <div className="mb-6 text-white">
            <img
              src={logoBranca}
              alt="Logo"
              className="h-17 w-17 mx-auto object-contain"
            />
          </div>

          {!isRegister ? (
            <>
              <h1 className="text-2xl font-normal text-white mb-2" data-testid="text-welcome-title">Bem-vindo de volta</h1>
              <p className="text-gray-400 text-sm mb-8" data-testid="text-welcome-subtitle">Por favor, insira suas credenciais para continuar</p>

              <form className="w-full space-y-4" onSubmit={handleLogin}>
                <div>
                  <label className="block text-gray-400 text-sm mb-2" htmlFor="email">Email</label>
                  <Input
                    id="email"
                    type="email"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    placeholder="voce@exemplo.com"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                    data-testid="input-email"
                    required
                  />
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-gray-400 text-sm" htmlFor="password">Senha</label>
                    <Dialog open={forgotPasswordOpen} onOpenChange={setForgotPasswordOpen}>
                      <DialogTrigger asChild>
                        <button type="button" className="text-blue-400 text-sm hover:text-blue-300 transition" data-testid="button-forgot-password">
                          Esqueceu?
                        </button>
                      </DialogTrigger>
                      <DialogContent className="bg-gray-900 border-gray-800">
                        <DialogHeader>
                          <DialogTitle className="text-white">Recuperação de Senha</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleForgotPassword} className="space-y-4">
                          <div>
                            <Label htmlFor="forgotEmail" className="text-gray-400">Email</Label>
                            <Input
                              id="forgotEmail"
                              type="email"
                              value={forgotPasswordEmail}
                              onChange={(e) => setForgotPasswordEmail(e.target.value)}
                              className="bg-gray-800 border-gray-700 text-white"
                              required
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              className="flex-1 border-gray-700 text-white hover:bg-gray-800"
                              onClick={() => setForgotPasswordOpen(false)}
                            >
                              Cancelar
                            </Button>
                            <Button
                              type="submit"
                              className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600"
                              disabled={forgotPasswordLoading}
                            >
                              {forgotPasswordLoading ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Enviando...
                                </>
                              ) : (
                                'Enviar'
                              )}
                            </Button>
                          </div>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    placeholder="••••••••"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                    data-testid="input-password"
                    required
                  />
                </div>

                <div className="flex items-center">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                    className="h-4 w-4 rounded bg-gray-800 border-gray-700 data-[state=checked]:bg-blue-500"
                    data-testid="checkbox-remember"
                  />
                  <label htmlFor="remember" className="ml-2 block text-sm text-gray-400">Lembrar de mim por 30 dias</label>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium py-3 px-4 rounded-lg transition duration-200 mt-2"
                  disabled={loginLoading || loading}
                  data-testid="button-submit-login"
                >
                  {loginLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Entrando...
                    </>
                  ) : (
                    'Entrar'
                  )}
                </Button>
              </form>

              <p className="text-sm text-gray-400 mt-6">
                Não tem uma conta? <button type="button" onClick={() => setIsRegister(true)} className="text-blue-400 hover:text-blue-300 transition" data-testid="link-signup">Cadastre-se</button>
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-normal text-white mb-2" data-testid="text-register-title">Criar conta</h1>
              <p className="text-gray-400 text-sm mb-8" data-testid="text-register-subtitle">Preencha os dados abaixo para se cadastrar</p>

              <form className="w-full space-y-4" onSubmit={handleRegister}>
                <div>
                  <label className="block text-gray-400 text-sm mb-2" htmlFor="name">Nome Completo</label>
                  <Input
                    id="name"
                    type="text"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    placeholder="Seu nome"
                    value={registerForm.name}
                    onChange={(e) => setRegisterForm(prev => ({ ...prev, name: e.target.value }))}
                    data-testid="input-name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2" htmlFor="company">Empresa</label>
                  <Input
                    id="company"
                    type="text"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    placeholder="Nome da empresa"
                    value={registerForm.company}
                    onChange={(e) => setRegisterForm(prev => ({ ...prev, company: e.target.value }))}
                    data-testid="input-company"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2" htmlFor="whatsapp">WhatsApp</label>
                  <Input
                    id="whatsapp"
                    type="tel"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    placeholder="(11) 99999-9999"
                    value={registerForm.whatsapp}
                    onChange={(e) => setRegisterForm(prev => ({ ...prev, whatsapp: e.target.value }))}
                    data-testid="input-whatsapp"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2" htmlFor="registerEmail">Email</label>
                  <Input
                    id="registerEmail"
                    type="email"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    placeholder="voce@exemplo.com"
                    value={registerForm.email}
                    onChange={(e) => setRegisterForm(prev => ({ ...prev, email: e.target.value }))}
                    data-testid="input-register-email"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-gray-400 text-sm mb-2" htmlFor="registerPassword">Senha</label>
                  <Input
                    id="registerPassword"
                    type="password"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    placeholder="••••••••"
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm(prev => ({ ...prev, password: e.target.value }))}
                    data-testid="input-register-password"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-400 text-sm mb-2" htmlFor="confirmPassword">Confirmar Senha</label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    placeholder="••••••••"
                    value={registerForm.confirmPassword}
                    onChange={(e) => setRegisterForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    data-testid="input-confirm-password"
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium py-3 px-4 rounded-lg transition duration-200 mt-2"
                  disabled={loginLoading}
                  data-testid="button-submit-register"
                >
                  {loginLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Criando conta...
                    </>
                  ) : (
                    'Criar conta'
                  )}
                </Button>
              </form>

              <p className="text-sm text-gray-400 mt-6">
                Já tem uma conta? <button type="button" onClick={() => setIsRegister(false)} className="text-blue-400 hover:text-blue-300 transition" data-testid="link-signin">Entre</button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
