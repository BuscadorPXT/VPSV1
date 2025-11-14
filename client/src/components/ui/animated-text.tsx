import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface AnimatedTextProps {
  delay?: number;
  effect?: 'fadeInUp' | 'bounceIn' | 'slideIn';
  className?: string;
  children: ReactNode;
}

export function AnimatedText({ 
  delay = 0, 
  effect = 'fadeInUp', 
  className, 
  children 
}: AnimatedTextProps) {
  return (
    <div 
      className={cn(
        "animate-in fade-in-0 slide-in-from-bottom-4",
        className
      )}
      style={{
        animationDelay: `${delay}ms`,
        animationDuration: '600ms'
      }}
    >
      {children}
    </div>
  );
}