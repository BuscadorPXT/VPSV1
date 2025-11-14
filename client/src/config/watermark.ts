/**
 * Configuração da Marca D'água do Dashboard
 * 
 * Para trocar a imagem da marca d'água:
 * 1. Substitua o arquivo na pasta attached_assets/
 * 2. Atualize o import abaixo com o novo nome do arquivo
 * 3. Ajuste a opacidade e tamanho conforme necessário
 */

import marcaDaguaImg from "@/assets/watermark-pattern.png";

export const WATERMARK_CONFIG = {
  // Imagem da marca d'água
  image: marcaDaguaImg,
  
  // Opacidade da marca d'água (imagem já tem opacidade correta embutida)
  opacity: 0.05,
  
  // Controle de visibilidade da marca d'água
  isVisible: false,
  
  // Tamanhos responsivos da marca d'água
  responsive: {
    desktop: 364,    // Desktop (>1024px)
    tablet: 280,     // Tablet (768px-1024px)
    mobile: 200,     // Mobile (480px-768px)
    small: 150       // Pequeno (<480px)
  },
  
  // Posição do background
  position: 'center',
  
  // Repetição do background
  repeat: 'repeat',
  
  // Anexar ao viewport (fixed) ou rolar com o conteúdo (scroll)
  attachment: 'fixed' as const,
  
  // Configurações responsivas para cobertura completa
  coverage: {
    // Garante que cubra toda a viewport
    width: '100vw',
    height: '100vh',
    minWidth: '100%',
    minHeight: '100%'
  },
  
  // Cor de overlay para garantir legibilidade
  overlayColor: {
    light: 'rgba(255, 255, 255, 0.85)', // Branco semi-transparente no modo claro
    dark: 'rgba(15, 23, 42, 0.85)' // Cinza escuro semi-transparente no modo escuro
  }
};

/**
 * Instruções para trocar a marca d'água:
 * 
 * 1. TROCAR IMAGEM:
 *    - Coloque a nova imagem na pasta attached_assets/
 *    - Atualize o import acima: import novaImagem from "@assets/nome-da-nova-imagem.png"
 *    - Atualize WATERMARK_CONFIG.image = novaImagem
 * 
 * 2. AJUSTAR OPACIDADE:
 *    - Modifique WATERMARK_CONFIG.opacity (valores entre 0.01 e 0.1)
 *    - Valores menores = mais sutil
 *    - Valores maiores = mais visível
 * 
 * 3. AJUSTAR TAMANHO:
 *    - Modifique WATERMARK_CONFIG.size (em pixels)
 *    - Valores menores = pattern mais denso
 *    - Valores maiores = pattern mais espaçado
 * 
 * 4. AJUSTAR COR DO OVERLAY:
 *    - Modifique WATERMARK_CONFIG.overlayColor.light para modo claro
 *    - Modifique WATERMARK_CONFIG.overlayColor.dark para modo escuro
 *    - Use rgba() para controlar transparência
 */