import { useEffect, useRef } from 'react';
import { apiRequest } from '@/lib/queryClient';

export const useActivityTracker = (enabled: boolean = true) => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const pingActivity = async () => {
    try {
      await apiRequest('/api/admin/ping-activity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      lastActivityRef.current = Date.now();
    } catch (error) {
      console.error('Failed to ping activity:', error);
    }
  };

  const updateActivity = () => {
    lastActivityRef.current = Date.now();
  };

  useEffect(() => {
    if (!enabled) return;

    // Set up activity listeners
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });

    // Set up periodic ping (every 2 minutes)
    intervalRef.current = setInterval(async () => {
      // Only ping if there was recent activity (within last 5 minutes)
      const timeSinceLastActivity = Date.now() - lastActivityRef.current;
      if (timeSinceLastActivity < 5 * 60 * 1000) {
        await pingActivity();
      }
    }, 2 * 60 * 1000); // Every 2 minutes

    // Initial ping
    pingActivity();

    return () => {
      // Cleanup
      events.forEach(event => {
        document.removeEventListener(event, updateActivity);
      });

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled]);

  return {
    pingActivity,
    lastActivity: lastActivityRef.current
  };
};