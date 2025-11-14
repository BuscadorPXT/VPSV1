import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user: {
    uid: string;
    email: string;
    role: string;
    subscriptionPlan: string;
    isApproved: boolean;
  };
}

export interface AdminRequest extends Request {
  user: {
    id: number;
    uid: string;
    email: string;
    name: string;
    role: string;
    subscriptionPlan: string;
    isApproved: boolean;
    isAdmin: boolean;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterParams {
  model?: string;
  storage?: string;
  color?: string;
  category?: string;
  capacity?: string;
  region?: string;
  supplier?: string;
  minPrice?: number;
  maxPrice?: number;
}