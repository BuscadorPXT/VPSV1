import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import logoBuscadorPXTWhite from "/logo_natal_branca.png";

const trackMetaEvent = (
  eventName: string,
  parameters?: Record<string, any>,
) => {
  if (typeof window !== "undefined" && (window as any).fbq) {
    (window as any).fbq("track", eventName, parameters);
  }
};

export default function LandingPage() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);

    try {
      if (typeof window !== "undefined" && !(window as any).DISABLE_TRACKING) {
        trackMetaEvent("ViewContent", {
          content_name: "Buscador PXT Landing Page",
          content_category: "Landing Page",
        });
      }
    } catch (error) {
      console.warn("Meta Pixel tracking error:", error);
    }

    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    const container = document.getElementById("preview-container");
    const card = document.getElementById("preview-card");

    if (container && card) {
      const handlePointerMove = (e: PointerEvent) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const midX = rect.width / 2;
        const midY = rect.height / 2;
        const rotateY = ((x - midX) / midX) * 6;
        const rotateX = -((y - midY) / midY) * 6;
        card.style.transform = `perspective(1200px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg)`;
      };

      const handlePointerLeave = () => {
        card.style.transform = "perspective(1200px) rotateX(0deg) rotateY(0deg)";
      };

      container.addEventListener("pointermove", handlePointerMove);
      container.addEventListener("pointerleave", handlePointerLeave);

      return () => {
        container.removeEventListener("pointermove", handlePointerMove);
        container.removeEventListener("pointerleave", handlePointerLeave);
      };
    }
  }, []);

  const handleCTAClick = (source: string) => {
    trackMetaEvent("Contact", {
      content_name: `CTA Click - ${source}`,
      method: "dashboard",
    });
    window.location.href = "/login";
  };

  const handleWhatsAppClick = (source: string, message: string) => {
    trackMetaEvent("Contact", {
      content_name: `WhatsApp - ${source}`,
      method: "whatsapp",
    });
    window.open(`https://wa.me/5511963232465?text=${encodeURIComponent(message)}`, "_blank");
  };

  return (
    <div className="antialiased bg-black text-zinc-100 font-['Inter'] overflow-x-hidden">
      {/* Background Effects */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1200px] h-[1200px] rounded-full blur-3xl opacity-30 bg-[radial-gradient(closest-side,rgba(29,78,216,0.4),rgba(0,0,0,0))]"></div>
        <div className="absolute bottom-0 right-0 w-[800px] h-[800px] translate-x-1/3 translate-y-1/3 rounded-full blur-3xl opacity-25 bg-[radial-gradient(closest-side,rgba(147,51,234,0.35),rgba(0,0,0,0))]"></div>
      </div>

      {/* Navigation */}
      <header className={`relative z-50 sticky top-0 backdrop-blur-xl border-b border-white/5 transition-all duration-300 ${
        isScrolled ? "bg-black/80" : "bg-black/50"
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <a href="#" className="flex items-center gap-2">
              <img src={logoBuscadorPXTWhite} alt="Buscador PXT" className="h-10 w-auto" />
            </a>
            <div className="flex gap-3 items-center">
              <Link href="/login">
                <Button variant="ghost" size="sm" className="text-zinc-300 hover:text-white" data-testid="button-login">
                  Entrar
                </Button>
              </Link>
              <button
                className="group relative inline-flex cursor-pointer transition-all duration-500 hover:scale-110 font-semibold text-white tracking-tight rounded-full px-6 py-3 items-center justify-center bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 shadow-lg hover:shadow-purple-500/50"
                onClick={() => handleWhatsAppClick("Header", "Olá! Gostaria de conhecer o Buscador PXT.")}
                data-testid="button-contact-header"
              >
                <span className="relative z-10">Começar Agora</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section - Mais Compacto */}
      <section className="relative z-10 pt-12 pb-8 sm:pt-20 sm:pb-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mx-auto space-y-6">
            <div className={`transition-all duration-1000 ${isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs sm:text-sm font-medium text-zinc-200 backdrop-blur-xl">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-blue-300">
                  <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"></path>
                </svg>
                Preços em Tempo Real
              </span>
            </div>

            <h1 className={`text-4xl font-bold text-white tracking-tight transition-all duration-1000 delay-200 sm:text-6xl lg:text-7xl ${isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
              Compare Preços Apple.<br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-500 to-cyan-400">Economize Sempre.</span>
            </h1>

            <p className={`max-w-2xl mx-auto text-lg text-zinc-400 transition-all duration-1000 delay-400 ${isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
              Mais de 40 fornecedores em um só lugar. Filtros avançados, alertas automáticos e histórico de preços para você tomar a melhor decisão.
            </p>

            {/* CTA Super Chamativo */}
            <div className={`flex flex-col sm:flex-row gap-4 justify-center items-center pt-6 transition-all duration-1000 delay-600 ${isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
              <button
                className="group relative overflow-hidden px-8 py-4 text-lg font-bold text-white bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 rounded-full shadow-2xl transition-all duration-300 hover:scale-105 hover:shadow-purple-500/50 animate-pulse hover:animate-none"
                onClick={() => handleCTAClick("Hero Primary")}
                data-testid="button-cta-hero-primary"
              >
                <span className="relative z-10 flex items-center gap-2">
                  🚀 Começar Teste Grátis Agora
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>
              
              <button
                className="flex gap-2 px-6 py-4 text-base font-medium text-white bg-white/5 border-2 border-white/20 rounded-full backdrop-blur-xl items-center hover:bg-white/10 hover:border-white/40 transition-all duration-200 hover:scale-105"
                onClick={() => handleWhatsAppClick("Hero Secondary", "Olá! Gostaria de receber alertas de preços por WhatsApp.")}
                data-testid="button-whatsapp-hero"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-green-400">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                WhatsApp
              </button>
            </div>
          </div>

          {/* Preview do Sistema - Simplificado */}
          <div id="preview-container" className="relative mt-12 sm:mt-16" style={{ perspective: '1200px' }}>
            <div className="absolute inset-0 -top-8 h-32 max-w-5xl mx-auto rounded-3xl bg-gradient-to-r from-blue-500/20 via-purple-500/15 to-cyan-500/20 blur-2xl"></div>
            
            <div
              id="preview-card"
              className="relative ring-1 ring-white/10 bg-zinc-950/90 border border-white/10 rounded-2xl backdrop-blur-2xl shadow-2xl overflow-hidden transition-transform duration-300"
              style={{
                maskImage: 'linear-gradient(black 0%, black 70%, transparent 100%)',
                transform: 'perspective(1200px) rotateX(0deg) rotateY(0deg)'
              }}
            >
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-white">Dashboard</h3>
                    <p className="text-zinc-400 text-sm">Ofertas em tempo real</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-green-500/20 border border-green-500/30 flex items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse"></div>
                    </div>
                    <span className="text-xs text-green-300">Online</span>
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    { name: "iPhone 15 Pro 128GB", color: "Azul Titânio", price: "R$ 6.299", store: "iPlace", priceColor: "emerald" },
                    { name: "MacBook Air M2", color: "256GB - Meia-noite", price: "R$ 8.999", store: "Apple Store", priceColor: "blue" },
                    { name: "iPad Pro 11\"", color: "128GB - Cinza Espacial", price: "R$ 7.499", store: "Fast Shop", priceColor: "purple" }
                  ].map((product, i) => (
                    <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-base font-medium text-white">{product.name}</h4>
                          <p className="text-sm text-zinc-400">{product.color}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-semibold text-${product.priceColor}-300`}>{product.price}</p>
                          <p className="text-xs text-zinc-500">{product.store}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefícios Principais - Ultra Condensado */}
      <section className="relative z-10 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { 
                icon: "⚡", 
                title: "Tempo Real", 
                desc: "Preços atualizados automaticamente",
                gradient: "from-blue-500 to-cyan-600"
              },
              { 
                icon: "🎯", 
                title: "Alertas Inteligentes", 
                desc: "Notificação quando o preço cair",
                gradient: "from-purple-500 to-pink-600"
              },
              { 
                icon: "📊", 
                title: "Histórico Completo", 
                desc: "Analise tendências e decida melhor",
                gradient: "from-emerald-500 to-green-600"
              }
            ].map((benefit, i) => (
              <div key={i} className="group relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 hover:bg-white/10 transition-all duration-300 hover:scale-105">
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${benefit.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
                <div className="relative">
                  <div className="text-4xl mb-3">{benefit.icon}</div>
                  <h3 className="text-xl font-semibold text-white mb-2">{benefit.title}</h3>
                  <p className="text-sm text-zinc-400">{benefit.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Depoimentos - Mantidos com Animação */}
      <section className="relative z-10 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
              Quem Usa, Aprova
            </h2>
            <p className="text-xl text-zinc-400">
              Milhares de profissionais economizando com o Buscador PXT
            </p>
          </div>

          <div className="relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-black via-black/80 to-transparent z-10 pointer-events-none"></div>
            <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-black via-black/80 to-transparent z-10 pointer-events-none"></div>

            <div className="flex gap-6 animate-scroll-left">
              {[
                { name: "Carlos Silva", role: "Revendedor Autorizado", text: "Economizo mais de 3 horas por dia. Sistema incrivelmente preciso!", gradient: "from-blue-500 to-cyan-600", initials: "CS" },
                { name: "Ana Costa", role: "Proprietária de Loja", text: "Aumentei minha margem de lucro em 15%. Ferramenta essencial!", gradient: "from-emerald-500 to-green-600", initials: "AC" },
                { name: "João Santos", role: "Comprador Corporativo", text: "Os filtros avançados facilitam muito nosso trabalho diário.", gradient: "from-purple-500 to-pink-600", initials: "JS" },
                { name: "Marina Ferreira", role: "Gestora de Compras", text: "Atualização em tempo real me ajuda em decisões rápidas.", gradient: "from-orange-500 to-red-600", initials: "MF" },
                { name: "Carlos Silva", role: "Revendedor Autorizado", text: "Economizo mais de 3 horas por dia. Sistema incrivelmente preciso!", gradient: "from-blue-500 to-cyan-600", initials: "CS" },
                { name: "Ana Costa", role: "Proprietária de Loja", text: "Aumentei minha margem de lucro em 15%. Ferramenta essencial!", gradient: "from-emerald-500 to-green-600", initials: "AC" },
              ].map((testimonial, i) => (
                <div key={i} className="shrink-0 w-80 p-6 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 backdrop-blur-xl">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`h-12 w-12 rounded-full bg-gradient-to-br ${testimonial.gradient} flex items-center justify-center`}>
                      <span className="text-white font-semibold">{testimonial.initials}</span>
                    </div>
                    <div>
                      <div className="text-white font-semibold">{testimonial.name}</div>
                      <div className="text-zinc-400 text-sm">{testimonial.role}</div>
                    </div>
                  </div>
                  <p className="text-zinc-200 text-sm leading-relaxed mb-4">{testimonial.text}</p>
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, j) => (
                      <svg key={j} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
                      </svg>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing - Compacto com CTA Forte */}
      <section id="pricing" className="relative z-10 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-bold text-white mb-3">Plano PRO</h2>
            <p className="text-lg text-zinc-400">Acesso total ao sistema por apenas</p>
          </div>

          <div className="relative rounded-3xl border-2 border-purple-500/30 bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl p-8 max-w-md mx-auto">
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-cyan-500/20 blur-2xl -z-10"></div>
            
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-purple-400/30 bg-purple-400/15 px-4 py-2 text-sm text-purple-100 mb-4">
                🏆 Mais Popular
              </div>
              <div className="flex items-end justify-center gap-2 mb-2">
                <span className="text-5xl font-bold text-white">R$ 289,90</span>
                <span className="text-zinc-400 text-lg mb-2">/mês</span>
              </div>
              <p className="text-sm text-zinc-400">Cancele quando quiser</p>
            </div>

            <ul className="space-y-3 mb-8">
              {[
                "✅ Alertas de preço ilimitados",
                "✅ Histórico completo de preços",
                "✅ Pesquisas ilimitadas",
                "✅ Suporte prioritário",
                "✅ +40 fornecedores verificados"
              ].map((feature, i) => (
                <li key={i} className="text-zinc-200 text-base flex items-center gap-2">
                  {feature}
                </li>
              ))}
            </ul>

            <button
              className="w-full py-4 text-xl font-bold text-white bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 rounded-xl shadow-2xl transition-all duration-300 hover:scale-105 hover:shadow-purple-500/50 animate-pulse hover:animate-none mb-3"
              onClick={() => handleCTAClick("Pricing")}
              data-testid="button-cta-pricing"
            >
              🎉 COMEÇAR TESTE GRÁTIS AGORA
            </button>
            <p className="text-center text-xs text-zinc-400">
              Sem cartão no início do teste • Cancele quando quiser
            </p>
          </div>

          {/* CTA Extra Forte no Final */}
          <div className="mt-12 text-center space-y-4">
            <p className="text-2xl font-semibold text-white">
              Pronto para economizar de verdade?
            </p>
            <button
              className="inline-flex items-center gap-3 px-10 py-5 text-xl font-bold text-white bg-gradient-to-r from-green-600 to-emerald-600 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 hover:shadow-green-500/50"
              onClick={() => handleWhatsAppClick("Final CTA", "Olá! Quero começar a economizar com o Buscador PXT agora!")}
              data-testid="button-whatsapp-final"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              FALAR NO WHATSAPP AGORA
            </button>
          </div>
        </div>
      </section>

      {/* Footer - Simplificado */}
      <footer className="relative z-10 border-t border-white/10 bg-zinc-900/40 backdrop-blur-xl mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <img src={logoBuscadorPXTWhite} alt="Buscador PXT" className="h-8 w-auto mb-3" />
              <p className="text-sm text-zinc-400">
                Comparação de preços Apple para profissionais.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white mb-3">Links</h3>
              <div className="space-y-2">
                <Link href="/login" className="block text-sm text-zinc-400 hover:text-white transition-colors">
                  Login
                </Link>
                <Link href="/terms-of-use" className="block text-sm text-zinc-400 hover:text-white transition-colors">
                  Termos de Uso
                </Link>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white mb-3">Contato</h3>
              <a href="mailto:suporte@buscadorpxt.com.br" className="block text-sm text-zinc-400 hover:text-white transition-colors mb-2">
                suporte@buscadorpxt.com.br
              </a>
              <p className="text-sm text-zinc-400">Segunda a Sexta: 9h às 18h</p>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-white/10 text-center">
            <p className="text-sm text-zinc-500">© 2025 Buscador PXT. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes scroll-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        .animate-scroll-left {
          animation: scroll-left 30s linear infinite;
        }

        .perspective-container {
          transform-style: preserve-3d;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}
