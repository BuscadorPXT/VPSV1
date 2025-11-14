
import { useState, useEffect } from 'react';

export function useMobileSimple() {
  // Detecção mobile simplificada e eficiente
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      const mobile = window.innerWidth < 768;
      console.log('📱 [useMobileSimple] Initial detection:', { 
        width: window.innerWidth, 
        mobile,
        timestamp: new Date().toISOString()
      });
      return mobile;
    }
    return false;
  });

  useEffect(() => {
    const checkMobile = () => {
      const width = window.innerWidth;
      const newIsMobile = width < 768;
      
      console.log('📱 Mobile check (useMobileSimple):', { 
        width, 
        newIsMobile, 
        currentState: isMobile,
        threshold: 768,
        changeDetected: newIsMobile !== isMobile
      });
      
      // Só atualizar se realmente mudou
      if (newIsMobile !== isMobile) {
        console.log('📱 Mobile state changing (useMobileSimple) from', isMobile, 'to', newIsMobile);
        setIsMobile(newIsMobile);
      }
    };

    // Check inicial
    checkMobile();

    // Debounce para evitar múltiplas mudanças rápidas
    let timeoutId: NodeJS.Timeout;
    const debouncedCheckMobile = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(checkMobile, 100);
    };

    // Listen for resize
    window.addEventListener('resize', debouncedCheckMobile);
    window.addEventListener('orientationchange', debouncedCheckMobile);
    
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', debouncedCheckMobile);
      window.removeEventListener('orientationchange', debouncedCheckMobile);
    };
  }, [isMobile]);

  return isMobile;
}
