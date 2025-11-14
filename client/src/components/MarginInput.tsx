import React, { useState, useEffect } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Percent, DollarSign, Calculator } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDebounce } from '@/hooks/useDebounce';

interface MarginInputProps {
  itemId: number;
  supplierPrice: number;
  initialMarginValue?: number;
  initialMarginType?: 'percentage' | 'fixed';
  onMarginChange?: (marginValue: number | null, marginType: 'percentage' | 'fixed', salesPrice: number) => void;
  className?: string;
}

export function MarginInput({ 
  itemId, 
  supplierPrice, 
  initialMarginValue, 
  initialMarginType = 'percentage',
  onMarginChange,
  className 
}: MarginInputProps) {
  const [marginValue, setMarginValue] = useState<string>(initialMarginValue?.toString() || '');
  const [marginType, setMarginType] = useState<'percentage' | 'fixed'>(initialMarginType);
  const [salesPrice, setSalesPrice] = useState<number>(supplierPrice);
  
  const queryClient = useQueryClient();
  const debouncedMarginValue = useDebounce(marginValue, 500);

  // Calculate sales price whenever margin changes
  useEffect(() => {
    const numValue = parseFloat(marginValue) || 0;
    let newSalesPrice = supplierPrice;
    
    if (marginValue && numValue > 0 && supplierPrice > 0) {
      if (marginType === 'percentage') {
        newSalesPrice = supplierPrice * (1 + numValue / 100);
      } else {
        newSalesPrice = supplierPrice + numValue;
      }
      
      // Validate the calculated price
      if (isNaN(newSalesPrice) || newSalesPrice <= 0) {
        console.error('❌ Invalid calculated sales price:', newSalesPrice);
        newSalesPrice = supplierPrice; // Fallback
      }
    }
    
    console.log(`💰 [MARGIN-CALC] Item ${itemId}: ${supplierPrice} + ${numValue}${marginType === 'percentage' ? '%' : 'R$'} = ${newSalesPrice}`);
    
    setSalesPrice(newSalesPrice);
    onMarginChange?.(marginValue ? numValue : null, marginType, newSalesPrice);
  }, [marginValue, marginType, supplierPrice, onMarginChange, itemId]);

  // API mutation for updating margin
  const updateMarginMutation = useMutation({
    mutationFn: async (data: { marginValue: number | null; marginType: 'percentage' | 'fixed' }) => {
      const { auth } = await import('@/lib/firebase');
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      
      const token = await user.getIdToken();
      const response = await fetch(`/api/interest-list/${itemId}/margin`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to update margin');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch interest list
      queryClient.invalidateQueries({ queryKey: ['/api/interest-list'] });
    },
    onError: (error) => {
      console.error('Error updating margin:', error);
    },
  });

  // Auto-save when debounced value changes
  useEffect(() => {
    if (debouncedMarginValue !== initialMarginValue?.toString()) {
      const numValue = parseFloat(debouncedMarginValue) || null;
      updateMarginMutation.mutate({ marginValue: numValue, marginType });
    }
  }, [debouncedMarginValue, marginType]);

  const formatPrice = (price: number) => `R$ ${price.toFixed(2).replace('.', ',')}`;

  return (
    <div className={cn("space-y-2", className)}>
      {/* Margin Input Row */}
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Input
            type="number"
            value={marginValue}
            onChange={(e) => setMarginValue(e.target.value)}
            placeholder="0"
            min="0"
            step="0.01"
            className="pr-8"
          />
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400">
            {marginType === 'percentage' ? <Percent className="h-4 w-4" /> : <DollarSign className="h-4 w-4" />}
          </div>
        </div>
        
        <Select value={marginType} onValueChange={(value: 'percentage' | 'fixed') => setMarginType(value)}>
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="percentage">%</SelectItem>
            <SelectItem value="fixed">R$</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Sales Price Display */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600 dark:text-gray-400">Preço de Venda:</span>
        <span className="font-semibold text-green-600 dark:text-green-400 flex items-center gap-1">
          <Calculator className="h-3 w-3" />
          {formatPrice(salesPrice)}
        </span>
      </div>

      {/* Margin Summary with Real-time Price Update */}
      {marginValue && parseFloat(marginValue) > 0 && (
        <div className="space-y-1">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {marginType === 'percentage' 
              ? `Margem: ${marginValue}% = ${formatPrice(salesPrice - supplierPrice)}`
              : `Margem fixa: ${formatPrice(parseFloat(marginValue))}`
            }
          </div>
          <div className="text-sm font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">
            💰 Preço de Venda: {formatPrice(salesPrice)}
          </div>
        </div>
      )}
    </div>
  );
}