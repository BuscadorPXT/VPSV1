
import { useEffect, useRef } from 'react';
import { cn } from "@/lib/utils";

interface RainbowLoadingWaveProps {
  text?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function RainbowLoadingWave({ 
  text = "Loading...", 
  className,
  size = "md" 
}: RainbowLoadingWaveProps) {
  const waveRef = useRef<HTMLDivElement>(null);

  const sizeClasses = {
    sm: "text-2xl",
    md: "text-4xl md:text-5xl",
    lg: "text-5xl md:text-6xl"
  };

  useEffect(() => {
    const splitTextToSpans = (targetElement: HTMLElement) => {
      if (targetElement) {
        const text = targetElement.textContent || '';
        targetElement.innerHTML = '';
        for (let character of text) {
          const span = document.createElement('span');
          if (character === ' ') {
            span.innerHTML = '&nbsp;';
          } else {
            span.textContent = character;
          }
          targetElement.appendChild(span);
        }
      }
    };

    if (waveRef.current) {
      splitTextToSpans(waveRef.current);
    }
  }, [text]);

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div 
        ref={waveRef}
        className={cn(
          "font-light tracking-tight text-center rainbow-loading-wave",
          sizeClasses[size]
        )}
        style={{
          fontFamily: "'Geist Sans', sans-serif",
          perspective: "80px",
          transformStyle: "preserve-3d",
          letterSpacing: "-0.02em"
        }}
      >
        {text}
      </div>
      
      <style jsx>{`
        .rainbow-loading-wave span {
          position: relative;
          transition: all 0.3s ease;
          display: inline-block;
          animation: loadingWave 2.4s ease infinite;
          letter-spacing: -0.02em;
          transform-origin: 100% 50%;
          transform-style: preserve-3d;
        }
        
        .rainbow-loading-wave span:nth-child(1) { animation-delay: 0s; }
        .rainbow-loading-wave span:nth-child(2) { animation-delay: 0.05s; }
        .rainbow-loading-wave span:nth-child(3) { animation-delay: 0.1s; }
        .rainbow-loading-wave span:nth-child(4) { animation-delay: 0.15s; }
        .rainbow-loading-wave span:nth-child(5) { animation-delay: 0.2s; }
        .rainbow-loading-wave span:nth-child(6) { animation-delay: 0.25s; }
        .rainbow-loading-wave span:nth-child(7) { animation-delay: 0.3s; }
        .rainbow-loading-wave span:nth-child(8) { animation-delay: 0.35s; }
        .rainbow-loading-wave span:nth-child(9) { animation-delay: 0.4s; }
        .rainbow-loading-wave span:nth-child(10) { animation-delay: 0.45s; }
        
        @keyframes loadingWave {
          0% {
            transform: translate3D(0,0,0) scale(1) rotateY(0);
            color: #ff0080;
            text-shadow: 0 0 10px rgba(255, 0, 128, 0.3);
          }
          12% {
            transform: translate3D(2px,-1px,2px) scale(1.18) rotateY(6deg);
            color: #ff4080;
            text-shadow: 0 0 20px rgba(255, 64, 128, 0.8), 0 0 40px rgba(255, 64, 128, 0.4);
          }
          15% {
            color: #ff8040;
            text-shadow: 0 0 25px rgba(255, 128, 64, 0.9), 0 0 50px rgba(255, 128, 64, 0.5);
          }
          24% {
            transform: translate3D(0,0,0) scale(1) rotateY(0);
            color: #ffff00;
            text-shadow: 0 0 20px rgba(255, 255, 0, 0.7), 0 0 40px rgba(255, 255, 0, 0.3);
            opacity: 1;
          }
          36% {
            transform: translate3D(0,0,0) scale(1);
            color: #80ff40;
            text-shadow: 0 0 15px rgba(128, 255, 64, 0.6), 0 0 30px rgba(128, 255, 64, 0.2);
          }
          48% {
            color: #40ff80;
            text-shadow: 0 0 12px rgba(64, 255, 128, 0.5), 0 0 25px rgba(64, 255, 128, 0.2);
          }
          60% {
            color: #00ffff;
            text-shadow: 0 0 10px rgba(0, 255, 255, 0.4), 0 0 20px rgba(0, 255, 255, 0.2);
          }
          72% {
            color: #4080ff;
            text-shadow: 0 0 8px rgba(64, 128, 255, 0.3), 0 0 15px rgba(64, 128, 255, 0.15);
          }
          84% {
            color: #8040ff;
            text-shadow: 0 0 6px rgba(128, 64, 255, 0.25), 0 0 12px rgba(128, 64, 255, 0.1);
          }
          100% {
            transform: scale(1);
            color: #ff0080;
            text-shadow: 0 0 5px rgba(255, 0, 128, 0.2);
            opacity: 0.8;
          }
        }
      `}</style>
    </div>
  );
}
