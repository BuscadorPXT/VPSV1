
import React, { useRef, useEffect } from 'react';

interface FloatingCardProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

const FloatingCard: React.FC<FloatingCardProps> = ({ 
  children, 
  className = "", 
  delay = 0 
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cardElement = cardRef.current;

    if (cardElement) {
      const handleMouseEnter = () => {
        cardElement.style.transform = 'translateY(-10px) scale(1.05) rotateX(5deg) rotateY(5deg)';
      };

      const handleMouseLeave = () => {
        cardElement.style.transform = 'translateY(0px) scale(1) rotateX(0deg) rotateY(0deg)';
      };

      cardElement.addEventListener('mouseenter', handleMouseEnter);
      cardElement.addEventListener('mouseleave', handleMouseLeave);

      return () => {
        cardElement.removeEventListener('mouseenter', handleMouseEnter);
        cardElement.removeEventListener('mouseleave', handleMouseLeave);
      };
    }
  }, []);

  return (
    <div
      ref={cardRef}
      className={`glass-card rounded-2xl p-4 shadow-xl transform transition-transform duration-300 cursor-3d-float ${className}`}
      style={{ animationDelay: `${delay}s` }}
    >
      {children}
    </div>
  );
};

export default FloatingCard;
