import { useRef, useEffect, useState } from 'react';

export function useParallax() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const getParallaxStyle = (speed: number = 0.5) => ({
    transform: `translateY(${scrollY * speed}px)`,
  });

  const getFloatingStyle = (speed: number = 0.3) => ({
    transform: `translateY(${Math.sin(scrollY * 0.01) * 10 * speed}px)`,
  });

  return {
    containerRef,
    scrollY,
    getParallaxStyle,
    getFloatingStyle,
  };
}