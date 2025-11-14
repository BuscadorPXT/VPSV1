import React from 'react';

interface RateSupplierButtonProps {
  supplierId: number;
  supplierName: string;
  className?: string;
  variant?: 'default' | 'compact' | 'minimal';
  showFullRatings?: boolean;
}

export function RateSupplierButton({ 
  supplierId, 
  supplierName, 
  className,
  variant = 'default',
  showFullRatings = false
}: RateSupplierButtonProps) {
  // Rating functionality has been removed
  return null;
}