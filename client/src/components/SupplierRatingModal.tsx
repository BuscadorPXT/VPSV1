import React from 'react';

interface SupplierRatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplierId: number;
  supplierName: string;
  existingRating?: any;
  onRatingSubmitted?: () => void;
}

export function SupplierRatingModal({
  isOpen,
  onClose,
  supplierId,
  supplierName,
  existingRating,
  onRatingSubmitted
}: SupplierRatingModalProps) {
  // Rating functionality has been removed
  return null;
}