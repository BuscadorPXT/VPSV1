class WebSocketManager {
  private static instance: WebSocketManager;
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private connectionPromise: Promise<void> | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private baseDelay = 2000;
  private maxDelay = 60000;
  private isConnecting = false;
  private shouldReconnect = true;

  private constructor() {}

  public static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  public async connect(userEmail?: string): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('🔗 [WSManager] Already connected');
      return;
    }

    if (this.isConnecting) {
      console.log('⏳ [WSManager] Connection in progress, waiting...');
      return this.connectionPromise || Promise.resolve();
    }

    this.isConnecting = true;
    this.connectionPromise = new Promise<void>((resolve, reject) => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        
        console.log(`🔄 [WSManager] Connecting to: ${wsUrl}`, { userEmail });

        const ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
          console.log('✅ [WSManager] Connected successfully');
          this.ws = ws;
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          resolve();
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.notifyListeners(message.type, message);
          } catch (error) {
            console.error('❌ [WSManager] Message parse error:', error);
          }
        };

        ws.onerror = (error) => {
          console.error('❌ [WSManager] WebSocket error:', error);
          this.isConnecting = false;
          reject(error);
        };

        ws.onclose = () => {
          console.log('🔌 [WSManager] Connection closed');
          this.ws = null;
          this.isConnecting = false;
          
          if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
            const delay = this.calculateReconnectDelay();
            console.log(`🔄 [WSManager] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
            
            this.reconnectTimeout = setTimeout(() => {
              this.reconnectAttempts++;
              this.connect(userEmail);
            }, delay);
          }
        };

      } catch (error) {
        console.error('❌ [WSManager] Connection error:', error);
        this.isConnecting = false;
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  public disconnect(): void {
    console.log('🔌 [WSManager] Disconnecting...');
    this.shouldReconnect = false;
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.isConnecting = false;
    this.connectionPromise = null;
    this.listeners.clear();
  }

  public on(eventType: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);

    return () => {
      this.listeners.get(eventType)?.delete(callback);
    };
  }

  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private notifyListeners(eventType: string, data: any): void {
    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`❌ [WSManager] Listener error for ${eventType}:`, error);
        }
      });
    }
  }

  private calculateReconnectDelay(): number {
    const delay = Math.min(
      this.baseDelay * Math.pow(2, this.reconnectAttempts),
      this.maxDelay
    );
    const jitter = delay * 0.25 * (Math.random() - 0.5);
    return Math.floor(delay + jitter);
  }
}

export const wsManager = WebSocketManager.getInstance();
