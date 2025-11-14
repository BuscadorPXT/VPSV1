import { WATERMARK_CONFIG } from "@/config/watermark";

interface WatermarkProps {
  opacity?: number;
  size?: number;
}

export function Watermark({ opacity = WATERMARK_CONFIG.opacity, size }: WatermarkProps) {
  console.log('🎨 Watermark component rendering with:', {
    image: WATERMARK_CONFIG.image,
    opacity,
    size,
    isVisible: WATERMARK_CONFIG.isVisible,
    imageUrl: `url(${WATERMARK_CONFIG.image})`
  });

  // Se a marca d'água está configurada para não ser visível, não renderizar nada
  if (!WATERMARK_CONFIG.isVisible) {
    return null;
  }

  return (
    <div
      className="watermark-responsive"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        minWidth: '100%',
        minHeight: '100%',
        maxWidth: '100vw',
        maxHeight: '100vh',
        zIndex: 9999,
        backgroundImage: `url(${WATERMARK_CONFIG.image})`,
        backgroundRepeat: 'repeat',
        backgroundSize: size ? `${size}px ${size}px` : 'var(--watermark-size, 364px) var(--watermark-size, 364px)',
        backgroundPosition: '0 0',
        backgroundAttachment: 'fixed',
        opacity: opacity,
        mixBlendMode: 'multiply',
        pointerEvents: 'none',
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden'
      }}
      data-testid="watermark-background"
    />
  );
}