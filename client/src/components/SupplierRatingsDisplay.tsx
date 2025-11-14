import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StarRating } from '@/components/ui/star-rating';
import { Badge } from '@/components/ui/badge';
import { Loader2, MessageSquare, User, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SupplierRatingsDisplayProps {
  supplierId: number;
  supplierName: string;
  averageRating?: string;
  ratingCount?: number;
  compact?: boolean;
}

export function SupplierRatingsDisplay({ 
  supplierId, 
  supplierName, 
  averageRating, 
  ratingCount,
  compact = false 
}: SupplierRatingsDisplayProps) {
  // Supplier ratings functionality has been removed as per the request.
  return null;
}