import { useEffect, useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

export function ChristmasDecorations() {
  const isMobile = useIsMobile();
  const [snowflakes, setSnowflakes] = useState<Array<{
    id: number;
    left: string;
    animationDuration: string;
    animationDelay: string;
    fontSize: string;
    opacity: number;
  }>>([]);

  const [stars, setStars] = useState<Array<{
    id: number;
    top: string;
    left: string;
    animationDelay: string;
  }>>([]);

  useEffect(() => {
    // Não renderizar decorações em mobile
    if (isMobile) return;

    const flakes = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      animationDuration: `${Math.random() * 10 + 10}s`,
      animationDelay: `${Math.random() * 5}s`,
      fontSize: `${Math.random() * 0.8 + 0.5}em`,
      opacity: Math.random() * 0.6 + 0.4,
    }));
    setSnowflakes(flakes);

    const decorativeStars = Array.from({ length: 15 }, (_, i) => ({
      id: i,
      top: `${Math.random() * 30}%`,
      left: `${Math.random() * 100}%`,
      animationDelay: `${Math.random() * 2}s`,
    }));
    setStars(decorativeStars);
  }, [isMobile]);

  // Não renderizar nada em mobile
  if (isMobile) return null;

  return (
    <div className="christmas-snow">
      {snowflakes.map((flake) => (
        <div
          key={`snow-${flake.id}`}
          className="snowflake"
          style={{
            left: flake.left,
            animationDuration: flake.animationDuration,
            animationDelay: flake.animationDelay,
            fontSize: flake.fontSize,
            opacity: flake.opacity,
          }}
        >
          ❄
        </div>
      ))}
      {stars.map((star) => (
        <div
          key={`star-${star.id}`}
          className="christmas-star"
          style={{
            top: star.top,
            left: star.left,
            animationDelay: star.animationDelay,
          }}
        >
          ✨
        </div>
      ))}
    </div>
  );
}
