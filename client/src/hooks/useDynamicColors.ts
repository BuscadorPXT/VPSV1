import { useEffect } from 'react';

export function useDynamicColors() {
  useEffect(() => {
    // Simple dynamic color effect for the landing page
    const updateColors = () => {
      const time = Date.now() * 0.001;
      const hue = (Math.sin(time * 0.1) * 30 + 210) % 360;
      
      // Update CSS custom properties for dynamic colors
      document.documentElement.style.setProperty('--dynamic-hue', hue.toString());
    };

    // 🔧 FIX: Increased interval from 1s to 30s to reduce resource consumption
    const interval = setInterval(updateColors, 30000);
    updateColors(); // Initial call

    return () => clearInterval(interval);
  }, []);
}