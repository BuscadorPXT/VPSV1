
import { createClient } from 'redis';

class RedisClient {
  private static instance: ReturnType<typeof createClient>;
  private static isConnected: boolean = false;

  static async getInstance() {
    if (!RedisClient.instance) {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      RedisClient.instance = createClient({
        url: redisUrl,
        socket: {
          reconnectStrategy: (retries) => Math.min(retries * 50, 1000)
        }
      });

      RedisClient.instance.on('error', (err) => {
        // Silenciar erros de conexão Redis para não poluir logs
        if (!err.message.includes('ECONNREFUSED')) {
          console.error('❌ Redis Client Error:', err);
        }
      });

      RedisClient.instance.on('connect', () => {
        console.log('✅ Redis Client Connected');
        RedisClient.isConnected = true;
      });

      RedisClient.instance.on('disconnect', () => {
        console.log('⚠️ Redis Client Disconnected');
        RedisClient.isConnected = false;
      });
    }

    if (!RedisClient.isConnected) {
      try {
        await RedisClient.instance.connect();
      } catch (error) {
        console.error('❌ Failed to connect to Redis:', error);
        throw error;
      }
    }

    return RedisClient.instance;
  }

  static async disconnect() {
    if (RedisClient.instance && RedisClient.isConnected) {
      await RedisClient.instance.disconnect();
      RedisClient.isConnected = false;
    }
  }
}

export default RedisClient;
