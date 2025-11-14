import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Users, MapPin, Clock, DollarSign, CheckCircle2, Copy, Check, Sparkles, PartyPopper, Info, AlertCircle, Phone } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import logoImage from '@assets/logo_preta_buscador_pxt_fundo_transparente_1760401730880.png';

export default function EncontroPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    whatsapp: '',
    accompanists: 2,
  });

  // Auto-fill form with user data if logged in
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.name || prev.name,
        email: user.email || prev.email,
      }));
    }
  }, [user]);

  // SEO and Open Graph meta tags for this page
  useEffect(() => {
    // Update page title
    document.title = 'Primeiro Encontro de Networking - Buscador PXT';
    
    // Update or create meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', 'Participe do primeiro encontro de networking do Buscador PXT. Conecte-se com profissionais do setor Apple e expanda sua rede de contatos. Inscreva-se agora!');

    // Open Graph tags
    const ogTags = [
      { property: 'og:title', content: 'Primeiro Encontro de Networking - Buscador PXT' },
      { property: 'og:description', content: 'Participe do primeiro encontro de networking do Buscador PXT. Conecte-se com profissionais do setor Apple e expanda sua rede de contatos.' },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: 'https://buscadorpxt.com.br/encontro' },
      { property: 'og:image', content: 'https://buscadorpxt.com.br/og-encontro-image.jpg' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: 'Primeiro Encontro de Networking - Buscador PXT' },
      { name: 'twitter:description', content: 'Participe do primeiro encontro de networking do Buscador PXT. Conecte-se com profissionais do setor Apple.' },
    ];

    ogTags.forEach(({ property, name, content }) => {
      const attr = property ? 'property' : 'name';
      const value = property || name || '';
      let metaTag = document.querySelector(`meta[${attr}="${value}"]`);
      
      if (!metaTag) {
        metaTag = document.createElement('meta');
        metaTag.setAttribute(attr, value);
        document.head.appendChild(metaTag);
      }
      metaTag.setAttribute('content', content);
    });

    // Cleanup: restore default title when component unmounts
    return () => {
      document.title = 'Buscador PXT - Compare preços de iPhones em tempo real';
    };
  }, []);

  const WHATSAPP_NUMBER = '5511963232465'; // Número do WhatsApp do atendimento (sem espaços ou caracteres especiais)
  const EVENT_ADDRESS = 'R. Brg. Tobias, 334 - Centro Histórico de São Paulo, São Paulo - SP, 01032-000';
  const EVENT_DATE = '25 de Outubro de 2025';
  const EVENT_TIME = 'A partir das 15h';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleWhatsAppRedirect = () => {
    const message = encodeURIComponent(
      `Olá! Gostaria de confirmar minha presença no Primeiro Encontro de Networking do Buscador PXT.\n\n` +
      `📋 Meus dados:\n` +
      `Nome: ${formData.name}\n` +
      `Email: ${formData.email}\n` +
      `WhatsApp: ${formData.whatsapp}\n` +
      `Pessoas: ${formData.accompanists} (você + ${formData.accompanists - 1} ${formData.accompanists === 2 ? 'acompanhante' : 'acompanhantes'})\n\n` +
      `Aguardo informações sobre o pagamento via PIX. Obrigado!`
    );
    
    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.whatsapp) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha todos os campos do formulário',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await apiRequest('/api/event/confirm', {
        method: 'POST',
        body: JSON.stringify(formData),
      });

      setConfirmed(true);
      
      // Redirecionar para WhatsApp após 1 segundo
      setTimeout(() => {
        handleWhatsAppRedirect();
      }, 1000);

      toast({
        title: '🎉 Solicitação enviada!',
        description: 'Agora vamos te redirecionar para o WhatsApp',
      });
    } catch (error: any) {
      console.error('Error confirming event:', error);
      toast({
        title: 'Erro ao enviar',
        description: error.message || 'Tente novamente',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (confirmed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:from-gray-950 dark:via-emerald-950/20 dark:to-teal-950/20 py-12 px-4">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-full mb-6 shadow-2xl">
              <PartyPopper className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-3">
              Presença Confirmada!
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              {formData.name}, sua vaga está garantida! 🎊
            </p>
          </div>

          <Card className="border-0 shadow-2xl">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-2xl">Local do Evento</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
                <p className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">
                  {EVENT_ADDRESS}
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 bg-white/60 dark:bg-gray-800/60 rounded-lg p-3">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Data</p>
                      <p className="font-semibold text-gray-800 dark:text-gray-200">{EVENT_DATE}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-white/60 dark:bg-gray-800/60 rounded-lg p-3">
                    <Clock className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Horário</p>
                      <p className="font-semibold text-gray-800 dark:text-gray-200">{EVENT_TIME}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-2xl">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg">
                  <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-2xl">Seus Dados</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {[
                  { label: 'Nome', value: formData.name },
                  { label: 'Email', value: formData.email },
                  { label: 'WhatsApp', value: formData.whatsapp },
                  { label: 'Pessoas', value: `${formData.accompanists} pessoas (você + ${formData.accompanists - 1} ${formData.accompanists === 2 ? 'acompanhante' : 'acompanhantes'})` },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-800/30 rounded-lg p-4">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{item.label}</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-2xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
                  <Phone className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-2xl">Próximo Passo: Pagamento</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-white/60 dark:bg-gray-800/60 rounded-xl p-6 border border-green-200 dark:border-green-800">
                <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-3">📱 Continue pelo WhatsApp</h3>
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  Enviamos seus dados para nossa equipe! Uma nova janela do WhatsApp foi aberta.
                </p>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Nossa equipe enviará a chave PIX para pagamento</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>Após confirmação do pagamento, você receberá a confirmação final</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>O local do evento será revelado após confirmação</span>
                  </li>
                </ul>
                <Button 
                  onClick={handleWhatsAppRedirect}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                  data-testid="button-whatsapp-reopen"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Abrir WhatsApp Novamente
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="text-center pt-6">
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-950/30 dark:to-purple-950/30 rounded-full border border-pink-200 dark:border-pink-800">
              <Sparkles className="w-5 h-5 text-pink-600" />
              <p className="font-medium text-gray-700 dark:text-gray-300">
                Será um prazer ter você em nosso primeiro encontro!
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-950 dark:via-blue-950/20 dark:to-purple-950/20 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-8">
            <img 
              src={logoImage} 
              alt="Buscador PXT" 
              className="h-16 md:h-20 w-auto dark:invert"
            />
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-950/50 dark:to-purple-950/50 rounded-full border border-blue-200 dark:border-blue-800 mb-6">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">Evento Exclusivo</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
            Primeiro Encontro de Networking
          </h1>
          <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
            Conecte-se com profissionais do setor e expanda sua rede de contatos
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="border-0 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:-translate-y-1">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-2xl">Detalhes do Evento</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-800/30 rounded-lg">
                  <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-gray-100">Data e Horário</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{EVENT_DATE} • {EVENT_TIME}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-800/30 rounded-lg">
                  <DollarSign className="w-5 h-5 text-green-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-gray-100">Investimento</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">R$ 289,90 (você + 1 acompanhante)</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">+ R$ 210,10 por pessoa adicional</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-800/30 rounded-lg">
                  <Users className="w-5 h-5 text-purple-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-gray-100">Incluso</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Alimentação completa</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Bebidas por conta de cada participante</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-2xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 hover:shadow-3xl transition-all duration-300 hover:-translate-y-1">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg">
                  <Info className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-2xl text-amber-900 dark:text-amber-200">Informações Importantes</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                'Valor debitado: apenas R$ 289,90',
                'Acompanhante adicional não é debitado',
                'Não haverá reembolso em caso de ausência',
                'Confirme até 17/10 (sexta-feira)'
              ].map((text, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-white/60 dark:bg-amber-900/20 rounded-lg">
                  <div className="flex-shrink-0 w-6 h-6 bg-amber-200 dark:bg-amber-800 rounded-full flex items-center justify-center mt-0.5">
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-200">{idx + 1}</span>
                  </div>
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-200">{text}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <Card className="border-0 shadow-2xl">
          <CardHeader className="border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-3xl">Confirme sua Presença</CardTitle>
                <CardDescription className="text-base mt-1">
                  Preencha seus dados e garanta sua vaga
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Nome Completo *
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    data-testid="input-name"
                    placeholder="Digite seu nome completo"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="h-12 text-base border-2"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Email *
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    data-testid="input-email"
                    placeholder="seu@email.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="h-12 text-base border-2"
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="whatsapp" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    WhatsApp *
                  </Label>
                  <Input
                    id="whatsapp"
                    name="whatsapp"
                    data-testid="input-whatsapp"
                    placeholder="(11) 99999-9999"
                    value={formData.whatsapp}
                    onChange={handleInputChange}
                    className="h-12 text-base border-2"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accompanists" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Número de Pessoas
                  </Label>
                  <select
                    id="accompanists"
                    name="accompanists"
                    data-testid="select-accompanists"
                    value={formData.accompanists}
                    onChange={(e) => setFormData(prev => ({ ...prev, accompanists: parseInt(e.target.value) }))}
                    className="w-full h-12 px-4 text-base border-2 border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="2">2 pessoas (você + 1 acompanhante - R$ 289,90)</option>
                    <option value="3">3 pessoas (você + 2 acompanhantes - R$ 500,00)</option>
                  </select>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-2 border-green-300 dark:border-green-700 rounded-2xl p-6 shadow-inner">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg shadow-lg">
                    <Phone className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-green-900 dark:text-green-200">Confirmação via WhatsApp</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-white/80 dark:bg-gray-800/80 rounded-xl p-4 border border-green-200 dark:border-green-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Valor Total:</span>
                      <span className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                        R$ {formData.accompanists === 2 ? '289,90' : '500,00'}
                      </span>
                    </div>
                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                      <p className="text-xs font-semibold text-blue-900 dark:text-blue-200 text-center">
                        💳 Valor debitado: apenas R$ 289,90
                      </p>
                      {formData.accompanists === 3 && (
                        <p className="text-xs text-blue-700 dark:text-blue-300 text-center mt-1">
                          (Acompanhante adicional não é debitado)
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                      Ao confirmar, você será direcionado para o WhatsApp para receber a chave PIX
                    </p>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-14 text-lg font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 shadow-2xl transition-all duration-300"
                data-testid="button-confirm-presence"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Confirmando...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    Confirmar Presença
                  </div>
                )}
              </Button>

              <p className="text-center text-sm text-gray-500 dark:text-gray-400 italic">
                Ao confirmar, você concorda que R$ 289,90 será debitado na próxima mensalidade
              </p>
            </form>
          </CardContent>
        </Card>

        <div className="text-center mt-12">
          <div className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-pink-50 via-purple-50 to-indigo-50 dark:from-pink-950/30 dark:via-purple-950/30 dark:to-indigo-950/30 rounded-full border-2 border-pink-200 dark:border-pink-800 shadow-lg">
            <PartyPopper className="w-6 h-6 text-pink-600" />
            <p className="text-lg font-semibold bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Será um prazer ter você em nosso primeiro encontro!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
