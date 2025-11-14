
export interface PricePoint {
  timestamp: string;
  price: number;
}

export interface PriceStatistics {
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  priceChange: number;
  priceChangePercentage: number;
  volatility: number;
}

export interface PriceHistoryData {
  model: string;
  brand: string;
  supplier: string;
  storage: string;
  color: string;
  currentPrice: number;
  priceHistory: PricePoint[];
  lastUpdated: string;
  statistics: PriceStatistics;
}

import { z } from 'zod';

export interface PriceHistoryQuery {
  model?: string;
  supplier?: string;
  storage?: string;
  color?: string;
  brand?: string;
  productId?: number;
  limit?: number;
}

export const priceHistoryQuerySchema = z.object({
  model: z.string().optional(),
  supplier: z.string().optional(),
  storage: z.string().optional(),
  color: z.string().optional(),
  brand: z.string().optional(),
  productId: z.coerce.number().optional(),
  limit: z.coerce.number().min(1).max(1000).default(100).optional()
});

export interface PriceHistoryResponse {
  success: boolean;
  data?: PriceHistoryData;
  message?: string;
  error?: string;
}
