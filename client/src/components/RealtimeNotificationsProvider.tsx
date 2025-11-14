import { useRealtimeNotifications } from '@/hooks/use-realtime-notifications';

interface RealtimeNotificationsProviderProps {
  children: React.ReactNode;
}

/**
 * Provider component to initialize real-time notifications across the app
 * This hook should be used once at the app level to handle WebSocket connections
 * and notifications for price drops, new products, and supplier updates.
 */
export const RealtimeNotificationsProvider: React.FC<RealtimeNotificationsProviderProps> = ({ children }) => {
  // Initialize real-time notifications - this sets up WebSocket listeners
  const { isConnected } = useRealtimeNotifications();

  // Log connection status for debugging
  if (typeof window !== 'undefined') {
    console.log('🔔 [RealtimeProvider] WebSocket connection status:', isConnected);
  }

  return <>{children}</>;
};

export default RealtimeNotificationsProvider;