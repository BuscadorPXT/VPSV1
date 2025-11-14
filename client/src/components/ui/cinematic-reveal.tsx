import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CinematicRevealProps {
  type?: 'mask' | 'parallax' | 'fade';
  delay?: number;
  duration?: number;
  className?: string;
  children: ReactNode;
}

export function CinematicReveal({ 
  type = 'fade', 
  delay = 0, 
  duration = 800, 
  className, 
  children 
}: CinematicRevealProps) {
  return (
    <div 
      className={cn(
        "animate-in fade-in-0 slide-in-from-bottom-6",
        className
      )}
      style={{
        animationDelay: `${delay}ms`,
        animationDuration: `${duration}ms`
      }}
    >
      {children}
    </div>
  );
}