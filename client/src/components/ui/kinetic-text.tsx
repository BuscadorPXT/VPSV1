import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface KineticTextProps {
  text: string;
  effect?: 'typewriter' | 'pulse' | 'gradient' | 'wave';
  className?: string;
  delay?: number;
  speed?: number;
  children?: ReactNode;
}

export function KineticText({ 
  text, 
  effect = 'typewriter', 
  className, 
  delay = 0, 
  speed = 1,
  children 
}: KineticTextProps) {
  return (
    <div 
      className={cn(
        "animate-in fade-in-0 slide-in-from-bottom-4",
        className
      )}
      style={{
        animationDelay: `${delay}ms`,
        animationDuration: `${1000 / speed}ms`
      }}
    >
      {text}
      {children}
    </div>
  );
}