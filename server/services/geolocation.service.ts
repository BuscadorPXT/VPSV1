import axios from 'axios';

interface GeolocationData {
  city: string | null;
  country: string | null;
  countryCode: string | null;
  latitude: string | null;
  longitude: string | null;
}

export class GeolocationService {
  private static instance: GeolocationService;
  private cache: Map<string, GeolocationData> = new Map();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas

  private constructor() {}

  public static getInstance(): GeolocationService {
    if (!GeolocationService.instance) {
      GeolocationService.instance = new GeolocationService();
    }
    return GeolocationService.instance;
  }

  public async getLocationFromIP(ipAddress: string): Promise<GeolocationData> {
    // Verifica se é um IP local ou inválido
    if (this.isLocalIP(ipAddress) || ipAddress === 'unknown') {
      return {
        city: 'Local/Unknown',
        country: 'Local/Unknown',
        countryCode: null,
        latitude: null,
        longitude: null,
      };
    }

    // Verifica cache
    const cached = this.cache.get(ipAddress);
    if (cached) {
      return cached;
    }

    try {
      console.log(`🌍 [Geolocation] Fetching location for IP: ${ipAddress}`);
      
      // Usa ipapi.co (gratuito até 1000 requests/dia)
      const response = await axios.get(`https://ipapi.co/${ipAddress}/json/`, {
        timeout: 5000, // 5 segundos timeout
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      });

      const data = response.data;

      // Verifica se a API retornou erro de rate limit
      if (data.error) {
        console.warn(`⚠️ [Geolocation] API error for ${ipAddress}:`, data.reason || data.error);
        throw new Error(`API error: ${data.reason || data.error}`);
      }

      const locationData: GeolocationData = {
        city: data.city || null,
        country: data.country_name || null,
        countryCode: data.country_code || null,
        latitude: data.latitude ? String(data.latitude) : null,
        longitude: data.longitude ? String(data.longitude) : null,
      };

      // Armazena no cache
      this.cache.set(ipAddress, locationData);

      // Remove do cache após duração definida
      setTimeout(() => {
        this.cache.delete(ipAddress);
      }, this.CACHE_DURATION);

      console.log(`✅ [Geolocation] Location found for ${ipAddress}: ${locationData.city}, ${locationData.country}`);

      return locationData;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ [Geolocation] Error getting location for IP ${ipAddress}: ${errorMessage}`);
      
      if (axios.isAxiosError(error)) {
        console.error(`❌ [Geolocation] HTTP Status: ${error.response?.status}, Data:`, error.response?.data);
      }

      // Retorna dados vazios em caso de erro
      const fallbackData: GeolocationData = {
        city: 'Unknown',
        country: 'Unknown',
        countryCode: null,
        latitude: null,
        longitude: null,
      };

      // Cacheia o erro para não fazer muitas requisições falhas
      this.cache.set(ipAddress, fallbackData);
      setTimeout(() => {
        this.cache.delete(ipAddress);
      }, 60 * 60 * 1000); // 1 hora para IPs com erro

      return fallbackData;
    }
  }

  private isLocalIP(ipAddress: string): boolean {
    // Lista de padrões de IPs locais
    const localPatterns = [
      /^127\./,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^::1$/,
      /^fe80:/,
      /^localhost$/i
    ];

    return localPatterns.some(pattern => pattern.test(ipAddress));
  }

  // Calcula distância entre duas coordenadas em km (fórmula de Haversine)
  public calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Raio da Terra em km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return Math.round(distance);
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
