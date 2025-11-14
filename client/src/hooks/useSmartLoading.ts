
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useIntersectionObserver } from './useIntersectionObserver';

interface SmartLoadingOptions {
  threshold?: number;
  rootMargin?: string;
  enabled?: boolean;
  delay?: number;
}

export function useSmartLoading(
  elementRef: React.RefObject<Element>,
  options: SmartLoadingOptions = {}
) {
  const {
    threshold = 0.1,
    rootMargin = '50px',
    enabled = true,
    delay = 0
  } = options;

  const [shouldLoad, setShouldLoad] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const isIntersecting = useIntersectionObserver(elementRef, {
    threshold,
    rootMargin,
    enabled
  });

  useEffect(() => {
    if (isIntersecting && enabled && !shouldLoad) {
      if (delay > 0) {
        const timer = setTimeout(() => setShouldLoad(true), delay);
        return () => clearTimeout(timer);
      } else {
        setShouldLoad(true);
      }
    }
  }, [isIntersecting, enabled, shouldLoad, delay]);

  const startLoading = useCallback(() => {
    setIsLoading(true);
  }, []);

  const finishLoading = useCallback(() => {
    setIsLoading(false);
  }, []);

  return {
    shouldLoad,
    isLoading,
    startLoading,
    finishLoading,
    isVisible: isIntersecting
  };
}
