
import RedisClient from '../lib/redis-client';

export class CacheService {
  private static instance: CacheService;

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Get value from cache with JSON parsing
   * ⚡ GRACEFUL DEGRADATION: Retorna null se Redis não estiver disponível
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const client = await RedisClient.getInstance();
      const value = await client.get(key);
      
      if (value === null) {
        return null;
      }

      return JSON.parse(value) as T;
    } catch (error) {
      // Silenciar erros de conexão Redis para não poluir logs
      if (!(error instanceof Error && error.message.includes('ECONNREFUSED'))) {
        console.warn(`⚠️ Cache unavailable for key ${key}`);
      }
      return null; // Graceful degradation - continua sem cache
    }
  }

  /**
   * Set value in cache with JSON stringification, compression and dynamic TTL
   * ⚡ GRACEFUL DEGRADATION: Falha silenciosa se Redis não estiver disponível
   */
  async set(key: string, value: any, ttlSeconds: number): Promise<void> {
    try {
      const client = await RedisClient.getInstance();
      let stringValue = JSON.stringify(value);
      
      // Compressão para valores grandes (>1KB)
      if (stringValue.length > 1024) {
        const zlib = await import('zlib');
        stringValue = zlib.gzipSync(stringValue).toString('base64');
        key = `compressed:${key}`;
      }
      
      // TTL dinâmico baseado no tamanho dos dados
      const dynamicTTL = stringValue.length > 10000 ? ttlSeconds * 2 : ttlSeconds;
      
      await client.setEx(key, dynamicTTL, stringValue);
      console.log(`✅ Cache SET: ${key} (TTL: ${dynamicTTL}s, Size: ${stringValue.length})`);
    } catch (error) {
      // Silenciar erros de conexão Redis - graceful degradation
      // Aplicação continua funcionando sem cache
    }
  }

  /**
   * Delete value from cache
   * ⚡ GRACEFUL DEGRADATION: Falha silenciosa se Redis não estiver disponível
   */
  async del(key: string): Promise<void> {
    try {
      const client = await RedisClient.getInstance();
      await client.del(key);
      console.log(`🗑️ Cache DEL: ${key}`);
    } catch (error) {
      // Graceful degradation - não precisa deletar se não tem cache
    }
  }

  /**
   * Generate cache key from search filters
   */
  generateSearchKey(filters: any): string {
    // Sort filters to ensure consistent key generation
    const sortedFilters = Object.keys(filters)
      .sort()
      .reduce((result, key) => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          result[key] = filters[key];
        }
        return result;
      }, {} as any);

    const filtersString = JSON.stringify(sortedFilters);
    return `products:search:${Buffer.from(filtersString).toString('base64')}`;
  }

  /**
   * Generate cache key for aggregations
   */
  generateAggregationsKey(filters: any): string {
    // Sort filters to ensure consistent key generation
    const sortedFilters = Object.keys(filters)
      .sort()
      .reduce((result, key) => {
        if (filters[key] !== undefined && filters[key] !== null && filters[key] !== '') {
          result[key] = filters[key];
        }
        return result;
      }, {} as any);

    const filtersString = JSON.stringify(sortedFilters);
    return `aggregations:search:${Buffer.from(filtersString).toString('base64')}`;
  }

  /**
   * Check Redis connection status
   */
  async isConnected(): Promise<boolean> {
    try {
      const client = await RedisClient.getInstance();
      await client.ping();
      return true;
    } catch (error) {
      return false;
    }
  }
}

export default CacheService.getInstance();
