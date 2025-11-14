import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import logoBuscadorPXTWhite from "@/assets/logo-buscador-pxt-white.png";

// Meta Pixel tracking helper
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
    // Simular carregamento
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 100);

    // Track Meta Pixel View Content event
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

    // Handle navbar background on scroll
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    // 3D tilt for preview
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
        card.style.transform =
          "perspective(1200px) rotateX(0deg) rotateY(0deg)";
      };

      container.addEventListener("pointermove", handlePointerMove);
      container.addEventListener("pointerleave", handlePointerLeave);

      return () => {
        container.removeEventListener("pointermove", handlePointerMove);
        container.removeEventListener("pointerleave", handlePointerLeave);
      };
    }
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    element?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="antialiased bg-black text-zinc-100 font-['Inter'] overflow-x-hidden">
      {/* Background glows */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1100px] h-[1100px] rounded-full blur-3xl opacity-30 bg-[radial-gradient(closest-side,rgba(59,130,246,0.35),rgba(0,0,0,0))]"></div>
        <div className="absolute -bottom-32 -left-20 w-[800px] h-[800px] rounded-full blur-3xl opacity-20 bg-[radial-gradient(closest-side,rgba(168,85,247,0.35),rgba(0,0,0,0))]"></div>
        <div className="absolute top-1/3 -right-24 w-[700px] h-[700px] rounded-full blur-3xl opacity-20 bg-[radial-gradient(closest-side,rgba(6,182,212,0.3),rgba(0,0,0,0))]"></div>
      </div>

      {/* Navbar */}
      <header
        className={`relative z-30 border-b border-white/5 backdrop-blur-xl transition-all duration-300 ${
          isScrolled ? "bg-black/70" : "bg-black/50"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <a href="#" className="flex items-center gap-2">
            <img
              src={logoBuscadorPXTWhite}
              alt="Buscador PXT"
              className="h-8 w-auto drop-shadow-lg"
            />
            <span className="text-lg font-semibold tracking-tight">
              Buscador PXT
            </span>
          </a>

          <nav className="hidden md:flex items-center gap-8">
            <button
              onClick={() => scrollToSection("como-funciona")}
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Como funciona
            </button>
            <button
              onClick={() => scrollToSection("recursos")}
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Recursos
            </button>
            <button
              onClick={() => scrollToSection("pricing")}
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Preços
            </button>
          </nav>

          <div className="hidden sm:flex items-center gap-3">
            <Link href="/login">
              <Button
                variant="ghost"
                size="sm"
                className="text-zinc-300 hover:text-white transition-colors"
              >
                Entrar
              </Button>
            </Link>
            <Button
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 backdrop-blur-xl px-4 py-2 text-sm font-medium transition-colors"
              onClick={() => {
                trackMetaEvent("Contact", {
                  content_name: "WhatsApp Contact - Header",
                  method: "whatsapp",
                });
                const message = encodeURIComponent(
                  "Olá! Gostaria de conhecer o sistema Buscador PXT e saber como posso começar a usar.",
                );
                window.open(
                  `https://wa.me/5547997446115?text=${message}`,
                  "_blank",
                );
              }}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488" />
              </svg>
              Falar no WhatsApp
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24">
          <div
            className={`mx-auto text-center transition-all duration-1000 ${isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-200 backdrop-blur-xl">
              <svg
                className="w-4 h-4 text-blue-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9.348 14.651a3.75 3.75 0 010-5.303m5.304 0a3.75 3.75 0 010 5.303m-7.425 2.122a6.75 6.75 0 010-9.546m9.546 0a6.75 6.75 0 010 9.546M5.106 18.894c3.808-3.808 9.98-3.808 13.788 0M12 12h.01"
                />
              </svg>
              Atualização em tempo real
            </div>

            <h1 className="mt-6 text-5xl sm:text-6xl md:text-7xl font-semibold tracking-tight leading-[1.05]">
              Descubra o melhor preço de iPhones e MacBooks em segundos.
            </h1>

            <p className="mt-6 max-w-2xl mx-auto text-lg sm:text-xl text-zinc-400">
              O Buscador PXT reúne as melhores ofertas de produtos Apple em um
              só lugar, com atualização automática e filtros avançados para você
              economizar tempo e dinheiro.
            </p>

            {/* Search + Chips */}
            <div className="mt-8 flex flex-col items-center gap-4">
              <div className="w-full max-w-2xl relative">
                <div className="absolute inset-0 -z-10 mx-auto h-20 max-w-2xl rounded-2xl bg-gradient-to-r from-blue-500/20 via-purple-500/15 to-cyan-500/20 blur-xl"></div>
                <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl px-3 py-2">
                  <svg
                    className="w-5 h-5 text-zinc-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                    />
                  </svg>
                  <input
                    type="text"
                    placeholder="Busque por iPhone 15, MacBook Air M2..."
                    className="flex-1 bg-transparent outline-none placeholder:text-zinc-500 text-white text-base"
                  />
                  <Link href="/login">
                    <Button className="inline-flex items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/20 hover:bg-blue-500/30 px-4 py-2 text-sm font-medium text-blue-200 transition-colors">
                      Buscar agora
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M8.25 4.5l7.5 7.5-7.5 7.5"
                        />
                      </svg>
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-2 text-sm">
                <button className="rounded-full border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-zinc-300 transition-colors">
                  iPhone 15
                </button>
                <button className="rounded-full border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-zinc-300 transition-colors">
                  iPhone 15 Pro
                </button>
                <button className="rounded-full border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-zinc-300 transition-colors">
                  MacBook Air M2
                </button>
                <button className="rounded-full border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-zinc-300 transition-colors">
                  MacBook Pro M3
                </button>
              </div>
            </div>
          </div>

          {/* Enhanced 3D Preview */}
          <div id="preview-container" className="relative mt-14 sm:mt-20 perspective-container">
            {/* Enhanced glow effect */}
            <div className="absolute inset-0 -top-8 h-40 max-w-5xl mx-auto rounded-3xl bg-gradient-to-r from-blue-500/20 via-purple-500/15 to-cyan-500/20 blur-2xl"></div>
            <div className="absolute inset-0 mx-auto h-32 max-w-4xl rounded-3xl bg-gradient-to-r from-blue-400/30 via-purple-400/20 to-cyan-400/30 blur-2xl"></div>

            {/* Floating Glass Cards with 3D effects */}
            <div className="pointer-events-none absolute -top-6 -left-2 sm:-left-16 z-20 fade-in fade-in-delay-4 float">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-2xl blur-xl"></div>
                <div className="glass-card rounded-2xl p-4 shadow-2xl cursor-3d-float">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center">
                        <svg
                          className="w-5 h-5 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0M9 11.25v3.75a3 3 0 106 0v-3.75"
                          />
                        </svg>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Alerta ativo</p>
                      <p className="text-xs text-zinc-300">
                        iPhone 15 ≤ R$ 4.299
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse"></div>
                      <span className="text-xs text-zinc-400">Monitorando preços...</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pointer-events-none absolute -top-4 -right-2 sm:-right-20 z-20 fade-in fade-in-delay-5 float float-delay-1">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-cyan-600/20 rounded-2xl blur-xl"></div>
                <div className="glass-card rounded-2xl p-4 shadow-2xl cursor-3d-float">
                  <div className="flex items-center justify-between gap-6">
                    <div className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-emerald-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"
                        />
                      </svg>
                      <span className="text-xs text-zinc-200">30 dias</span>
                    </div>
                    <span className="text-xs text-emerald-300 font-medium">
                      -12%
                    </span>
                  </div>
                  <div className="mt-2 flex items-end gap-1">
                    <div className="w-1.5 h-2 bg-emerald-400/70 rounded"></div>
                    <div className="w-1.5 h-3 bg-emerald-400/70 rounded"></div>
                    <div className="w-1.5 h-4 bg-emerald-400/70 rounded"></div>
                    <div className="w-1.5 h-6 bg-emerald-400/70 rounded"></div>
                    <div className="w-1.5 h-5 bg-emerald-400/70 rounded"></div>
                    <div className="w-1.5 h-7 bg-emerald-400/70 rounded"></div>
                    <div className="w-1.5 h-8 bg-emerald-400/70 rounded"></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pointer-events-none absolute bottom-8 -left-10 sm:-left-24 z-20 fade-in fade-in-delay-4 float float-delay-2">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 to-pink-600/20 rounded-2xl blur-xl"></div>
                <div className="glass-card rounded-2xl p-3 shadow-2xl cursor-3d-float">
                  <div className="text-center">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-pink-600 flex items-center justify-center mx-auto mb-2">
                      <svg
                        className="w-4 h-4 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                        />
                      </svg>
                    </div>
                    <p className="text-xs font-medium text-white">Verificado</p>
                    <p className="text-xs text-violet-300">Fornecedores confiáveis</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mini features */}
      <section className="relative z-10 pt-16 pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center">
                  <svg
                    className="w-4.5 h-4.5 text-white/80"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium">Atualização automática</p>
                  <p className="text-xs text-zinc-400">
                    A cada poucos segundos
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center">
                  <svg
                    className="w-4.5 h-4.5 text-white/80"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m0 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium">Filtros avançados</p>
                  <p className="text-xs text-zinc-400">
                    Estado, cor, capacidade, loja
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center">
                  <svg
                    className="w-4.5 h-4.5 text-white/80"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium">Melhor custo-benefício</p>
                  <p className="text-xs text-zinc-400">
                    Ranking por economia real
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center">
                  <svg
                    className="w-4.5 h-4.5 text-white/80"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium">Lojas confiáveis</p>
                  <p className="text-xs text-zinc-400">
                    Curadoria e verificação
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/login">
              <Button className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/20 hover:bg-blue-500/30 px-5 py-3 text-sm font-medium text-blue-100 transition-colors">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423L16.5 15.75l.394 1.183a2.25 2.25 0 001.423 1.423L19.5 18.75l-1.183.394a2.25 2.25 0 00-1.423 1.423z"
                  />
                </svg>
                Explorar ofertas agora
              </Button>
            </Link>
            <Button
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 backdrop-blur-xl px-5 py-3 text-sm text-white transition-colors"
              onClick={() => {
                trackMetaEvent("Contact", {
                  content_name: "WhatsApp Contact - CTA",
                  method: "whatsapp",
                });
                const message = encodeURIComponent(
                  "Olá! Gostaria de receber alertas de preços por WhatsApp e conhecer o Buscador PXT.",
                );
                window.open(
                  `https://wa.me/5547997446115?text=${message}`,
                  "_blank",
                );
              }}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                />
              </svg>
              Receber alertas por WhatsApp
            </Button>
          </div>
        </div>
      </section>

      {/* Como Funciona */}
      <section id="como-funciona" className="relative z-10 pt-4 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
              Como Funciona
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              Quatro passos simples para encontrar o melhor preço
            </p>
          </div>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center">
                  <svg
                    className="w-4.5 h-4.5 text-blue-200"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                    />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-zinc-400">Passo 1</p>
                  <h3 className="text-base font-semibold tracking-tight mt-0.5">
                    Busque pelo modelo
                  </h3>
                  <p className="text-sm text-zinc-400 mt-1">
                    Digite o modelo do iPhone, iPad ou MacBook que você procura
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center">
                  <svg
                    className="w-4.5 h-4.5 text-emerald-200"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.589-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.589-1.202L5.25 4.971z"
                    />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-zinc-400">Passo 2</p>
                  <h3 className="text-base font-semibold tracking-tight mt-0.5">
                    Compare preços
                  </h3>
                  <p className="text-sm text-zinc-400 mt-1">
                    Veja ofertas de diversos fornecedores em tempo real
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center">
                  <svg
                    className="w-4.5 h-4.5 text-purple-200"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m0 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"
                    />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-zinc-400">Passo 3</p>
                  <h3 className="text-base font-semibold tracking-tight mt-0.5">
                    Aplique filtros
                  </h3>
                  <p className="text-sm text-zinc-400 mt-1">
                    Filtre por cor, armazenamento, região e muito mais
                  </p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center">
                  <svg
                    className="w-4.5 h-4.5 text-cyan-200"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                    />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-zinc-400">Passo 4</p>
                  <h3 className="text-base font-semibold tracking-tight mt-0.5">
                    Escolha a melhor oferta
                  </h3>
                  <p className="text-sm text-zinc-400 mt-1">
                    Encontre o melhor custo-benefício para seu negócio
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Principais Funcionalidades */}
      <section id="recursos" className="relative z-10 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
              Principais Funcionalidades
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              Tudo que você precisa para otimizar suas compras
            </p>
          </div>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center">
                  <svg
                    className="w-4.5 h-4.5 text-blue-200"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-semibold tracking-tight">
                    Busca Inteligente
                  </h3>
                  <p className="text-sm text-zinc-400 mt-1">
                    Encontre qualquer modelo Apple com precisão e velocidade
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center">
                  <svg
                    className="w-4.5 h-4.5 text-emerald-200"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.183m0 0v4.991v4.99"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-semibold tracking-tight">
                    Atualização Automática
                  </h3>
                  <p className="text-sm text-zinc-400 mt-1">
                    Preços sempre atualizados em tempo real
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center">
                  <svg
                    className="w-4.5 h-4.5 text-purple-200"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-semibold tracking-tight">
                    Filtros Avançados
                  </h3>
                  <p className="text-sm text-zinc-400 mt-1">
                    Filtre por cor, capacidade, região e fornecedor
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center">
                  <svg
                    className="w-4.5 h-4.5 text-cyan-200"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-semibold tracking-tight">
                    Dashboard Intuitivo
                  </h3>
                  <p className="text-sm text-zinc-400 mt-1">
                    Interface limpa e fácil de usar
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center">
                  <svg
                    className="w-4.5 h-4.5 text-teal-200"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-semibold tracking-tight">
                    Acesso Seguro
                  </h3>
                  <p className="text-sm text-zinc-400 mt-1">
                    Dados protegidos com criptografia de ponta
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center">
                  <svg
                    className="w-4.5 h-4.5 text-amber-200"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.228a25.14 25.14 0 012.16.470m-2.16-.47V2.721m2.16.47c.9.134 1.77.308 2.609.528a6.003 6.003 0 01-5.395 5.472m0 0a6.726 6.726 0 01-2.748 1.35m0 0V14.25"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-semibold tracking-tight">
                    Recursos PRO
                  </h3>
                  <p className="text-sm text-zinc-400 mt-1">
                    Histórico de preços, favoritos e alertas exclusivos
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Para Quem É o Buscador PXT */}
      <section className="relative z-10 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
              Para Quem É o Buscador PXT
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              Ideal para profissionais que precisam de informações precisas
            </p>
          </div>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center">
                  <svg
                    className="w-4.5 h-4.5 text-emerald-200"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-semibold tracking-tight">
                    Revendedores
                  </h3>
                  <p className="text-sm text-zinc-400 mt-1">
                    Encontre os melhores preços para revenda
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center">
                  <svg
                    className="w-4.5 h-4.5 text-blue-200"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-semibold tracking-tight">
                    Lojistas
                  </h3>
                  <p className="text-sm text-zinc-400 mt-1">
                    Monitore concorrência e preços de mercado
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center">
                  <svg
                    className="w-4.5 h-4.5 text-purple-200"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M2.25 21h19.5m-18-18v18m2.25-18v18m13.5-18v18M6.75 7.5A1.5 1.5 0 018.25 6h7.5a1.5 1.5 0 011.5 1.5v7.5a1.5 1.5 0 01-1.5 1.5h-7.5a1.5 1.5 0 01-1.5-1.5v-7.5z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-semibold tracking-tight">
                    Empresas
                  </h3>
                  <p className="text-sm text-zinc-400 mt-1">
                    Compras corporativas com economia garantida
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* O que nossos usuários dizem */}
      <section className="relative z-10 pb-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
              O que nossos usuários dizem
            </h2>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
              <svg
                className="w-5 h-5 text-blue-200"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
                />
              </svg>
              <p className="mt-3 text-sm text-zinc-200">
                "Economizo mais de 3 horas por dia na pesquisa de preços. O
                sistema é incrivelmente preciso e rápido."
              </p>
              <div className="mt-4">
                <p className="text-sm font-medium">Carlos Silva</p>
                <p className="text-xs text-zinc-400">Revendedor Autorizado</p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
              <svg
                className="w-5 h-5 text-emerald-200"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
                />
              </svg>
              <p className="mt-3 text-sm text-zinc-200">
                "Consegui aumentar minha margem de lucro em 15% usando o
                Buscador PXT para encontrar os melhores fornecedores."
              </p>
              <div className="mt-4">
                <p className="text-sm font-medium">Ana Costa</p>
                <p className="text-xs text-zinc-400">Proprietária de Loja</p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
              <svg
                className="w-5 h-5 text-purple-200"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
                />
              </svg>
              <p className="mt-3 text-sm text-zinc-200">
                "Ferramenta essencial para nossa empresa. Os filtros avançados
                facilitam muito nosso trabalho."
              </p>
              <div className="mt-4">
                <p className="text-sm font-medium">João Santos</p>
                <p className="text-xs text-zinc-400">Comprador Corporativo</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Perguntas Frequentes */}
      <section className="relative z-10 pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
              Perguntas Frequentes
            </h2>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center mt-0.5">
                  <svg
                    className="w-4 h-4 text-blue-200"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold tracking-tight">
                    Como os preços são atualizados?
                  </h3>
                  <p className="text-sm text-zinc-400 mt-1">
                    Os preços são atualizados automaticamente através de
                    integração com nossos fornecedores, garantindo informações
                    sempre atuais e precisas.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center mt-0.5">
                  <svg
                    className="w-4 h-4 text-emerald-200"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold tracking-tight">
                    Posso usar o sistema no celular?
                  </h3>
                  <p className="text-sm text-zinc-400 mt-1">
                    Sim! O Buscador PXT é totalmente responsivo e funciona
                    perfeitamente em smartphones, tablets e computadores.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center mt-0.5">
                  <svg
                    className="w-4 h-4 text-purple-200"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold tracking-tight">
                    Quantos fornecedores estão cadastrados?
                  </h3>
                  <p className="text-sm text-zinc-400 mt-1">
                    Trabalhamos com mais de 40 fornecedores verificados,
                    oferecendo uma ampla comparação de preços do mercado.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center mt-0.5">
                  <svg
                    className="w-4 h-4 text-cyan-200"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold tracking-tight">
                    Existe período de teste gratuito?
                  </h3>
                  <p className="text-sm text-zinc-400 mt-1">
                    Sim, oferecemos demonstração gratuita para que você possa
                    conhecer todas as funcionalidades antes de assinar.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing (PRO) */}
      <section id="pricing" className="relative z-10 pt-6 pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
              Preços
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              Desbloqueie recursos avançados com o plano PRO.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Free Trial Card */}
            <div className="relative rounded-2xl border border-emerald-500/30 bg-emerald-500/10 backdrop-blur-xl p-6 sm:p-8">
              <div className="absolute -inset-x-8 -top-8 h-24 rounded-3xl bg-gradient-to-r from-emerald-500/20 via-green-500/15 to-teal-500/20 blur-2xl"></div>
              <div className="relative flex flex-col gap-5">
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/15 px-3 py-1.5 text-xs text-emerald-100">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                      />
                    </svg>
                    FREE
                  </div>
                  <span className="text-xs text-emerald-300">
                    Teste por 7 dias
                  </span>
                </div>

                <div className="flex items-end gap-2">
                  <span className="text-4xl sm:text-5xl font-semibold tracking-tight text-emerald-300">
                    Grátis
                  </span>
                  <span className="text-emerald-400 text-sm mb-1">7 dias de teste</span>
                </div>

                <ul className="grid gap-2.5 text-sm text-emerald-200">
                  <li className="inline-flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-emerald-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z"
                      />
                    </svg>
                    Acesso à lista completa
                  </li>
                  <li className="inline-flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-emerald-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z"
                      />
                    </svg>
                    Limite de 1 acesso por dispositivo
                  </li>
                  <li className="inline-flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-zinc-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                    Sem acesso aos fornecedores (links/contatos)
                  </li>
                </ul>

                <div className="pt-2">
                  <Link href="/login">
                    <Button className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/20 hover:bg-emerald-500/30 px-5 py-3 text-sm font-medium text-emerald-100 transition-colors">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423L16.5 15.75l.394 1.183a2.25 2.25 0 001.423 1.423L19.5 18.75l-1.183.394a2.25 2.25 0 00-1.423 1.423z"
                        />
                      </svg>
                      Começar teste grátis
                    </Button>
                  </Link>
                  <p className="mt-3 text-center text-xs text-emerald-400">
                    Sem cartão de crédito necessário.
                  </p>
                </div>
              </div>
            </div>

            {/* PRO Plan Card */}
            <div className="relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 sm:p-8">
              <div className="absolute -inset-x-8 -top-8 h-24 rounded-3xl bg-gradient-to-r from-blue-500/20 via-purple-500/15 to-cyan-500/20 blur-2xl"></div>
              <div className="relative flex flex-col gap-5">
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-400/15 px-3 py-1.5 text-xs text-blue-100">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.228a25.14 25.14 0 012.16.470m-2.16-.47V2.721m2.16.47c.9.134 1.77.308 2.609.528a6.003 6.003 0 01-5.395 5.472m0 0a6.726 6.726 0 01-2.748 1.35m0 0V14.25"
                      />
                    </svg>
                    PRO
                  </div>
                  <span className="text-xs text-zinc-400">
                    Cancelamento a qualquer momento
                  </span>
                </div>

                <div className="flex items-end gap-2">
                  <span className="text-4xl sm:text-5xl font-semibold tracking-tight">
                    R$ 289,90
                  </span>
                  <span className="text-zinc-400 text-sm mb-1">/mês</span>
                </div>

                <ul className="grid gap-2.5 text-sm text-zinc-300">
                  <li className="inline-flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-emerald-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0M9 11.25v3.75a3 3 0 106 0v-3.75"
                      />
                    </svg>
                    Alertas de preço ilimitados
                  </li>
                  <li className="inline-flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-emerald-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941"
                      />
                    </svg>
                    Histórico e tendências de preços
                  </li>
                  <li className="inline-flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-emerald-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                      />
                    </svg>
                    Pesquisas Ilimitadas
                  </li>
                  <li className="inline-flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-emerald-300"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                      />
                    </svg>
                    Suporte prioritário
                  </li>
                </ul>

                <div className="pt-2">
                  <Link href="/login">
                    <Button className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/20 hover:bg-blue-500/30 px-5 py-3 text-sm font-medium text-blue-100 transition-colors">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423L16.5 15.75l.394 1.183a2.25 2.25 0 001.423 1.423L19.5 18.75l-1.183.394a2.25 2.25 0 00-1.423 1.423z"
                        />
                      </svg>
                      Começar teste grátis
                    </Button>
                  </Link>
                  <p className="mt-3 text-center text-xs text-zinc-400">
                    Sem cartão no início do teste.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/10 bg-zinc-900/40 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Brand Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 via-purple-600 to-cyan-500 flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423L16.5 15.75l.394 1.183a2.25 2.25 0 001.423 1.423L19.5 18.75l-1.183.394a2.25 2.25 0 00-1.423 1.423z"
                    />
                  </svg>
                </div>
                <span className="text-lg font-semibold text-white">
                  Buscador PXT
                </span>
              </div>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Sistema de comparação de preços Apple para profissionais que
                buscam eficiência e economia.
              </p>
            </div>

            {/* Links Úteis */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-white">Links Úteis</h3>
              <div className="space-y-2">
                <Link
                  href="/login"
                  className="block text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  Login
                </Link>
                <a
                  href="#"
                  className="block text-sm text-zinc-400 hover:text-white transition-colors"
                  onClick={(e) => {
                    e.preventDefault();
                    trackMetaEvent("Contact", {
                      content_name: "WhatsApp Contact - Footer Suporte",
                      method: "whatsapp",
                    });
                    const message = encodeURIComponent(
                      "Olá! Preciso de suporte com o Buscador PXT.",
                    );
                    window.open(
                      `https://wa.me/5547997446115?text=${message}`,
                      "_blank",
                    );
                  }}
                >
                  Suporte
                </a>
                <Link
                  href="/terms-of-use"
                  className="block text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  Termos de Uso
                </Link>
              </div>
            </div>

            {/* Contato */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-white">Contato</h3>
              <div className="space-y-2">
                <a
                  href="mailto:suporte@buscadorpxt.com.br"
                  className="block text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  suporte@buscadorpxt.com.br
                </a>
                <p className="text-sm text-zinc-400">
                  Segunda a Sexta: 9h às 18h
                </p>
              </div>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="mt-8 pt-8 border-t border-white/10 text-center">
            <p className="text-sm text-zinc-500">
              © 2025 Buscador PXT. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}