
import { useEffect, useCallback } from 'react';
import { useIsMobile } from './use-mobile';

export function useMobileOptimization() {
  const { isMobile, isTouch } = useIsMobile();

  useEffect(() => {
    if (!isMobile) return;

    // Disable zoom on double tap for iOS
    let lastTouchEnd = 0;
    const handleTouchEnd = (e: TouchEvent) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    };

    // Prevent pull-to-refresh on mobile
    const preventPullToRefresh = (e: TouchEvent) => {
      if (e.touches.length > 1) return;
      
      const touch = e.touches[0];
      const { scrollTop } = document.documentElement;
      
      if (scrollTop === 0 && touch.clientY > 50) {
        e.preventDefault();
      }
    };

    // Add event listeners
    document.addEventListener('touchend', handleTouchEnd, { passive: false });
    document.addEventListener('touchstart', preventPullToRefresh, { passive: false });
    document.addEventListener('touchmove', preventPullToRefresh, { passive: false });

    // Set viewport meta for mobile
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
    }

    return () => {
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchstart', preventPullToRefresh);
      document.removeEventListener('touchmove', preventPullToRefresh);
    };
  }, [isMobile]);

  // Haptic feedback function
  const triggerHapticFeedback = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!isTouch || !('vibrate' in navigator)) return;
    
    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30]
    };
    
    navigator.vibrate(patterns[type]);
  }, [isTouch]);

  // Performance optimization for mobile
  const optimizeForMobile = useCallback(() => {
    if (!isMobile) return;

    // Add will-change property to frequently animated elements
    const animatedElements = document.querySelectorAll('[data-mobile-animated]');
    animatedElements.forEach(el => {
      (el as HTMLElement).style.willChange = 'transform, opacity';
    });

    // Optimize scroll performance
    const scrollElements = document.querySelectorAll('[data-mobile-scroll]');
    scrollElements.forEach(el => {
      (el as HTMLElement).style.webkitOverflowScrolling = 'touch';
      (el as HTMLElement).style.overscrollBehavior = 'contain';
    });
  }, [isMobile]);

  useEffect(() => {
    optimizeForMobile();
  }, [optimizeForMobile]);

  return {
    isMobile,
    isTouch,
    triggerHapticFeedback,
    optimizeForMobile
  };
}
