/**
 * Centralized formatting utilities for consistent display across the application
 */

/**
 * Formats a price number to Brazilian Real currency format: R$ 00.000,00
 * @param price - The price as a number or string
 * @returns Formatted price string
 */
export function formatPrice(price: string | number): string {
  let numPrice: number;
  
  if (typeof price === 'string') {
    const originalPrice = price.toString().trim();
    
    // Handle empty or invalid strings - return empty, not zero
    if (!originalPrice || originalPrice === '') {
      return '';
    }
    
    // Remove currency symbols and spaces
    let cleanPrice = originalPrice.replace(/[R$\s]/g, '');
    
    // Handle empty after cleanup
    if (!cleanPrice || cleanPrice === '') {
      return '';
    }
    
    // Brazilian format parsing: dot for thousands, comma for decimal
    if (cleanPrice.includes(',') && cleanPrice.includes('.')) {
      // Format: "21.700,00" - dot is thousands, comma is decimal
      // Remove all dots (thousands) and replace comma with dot (decimal)
      cleanPrice = cleanPrice.replace(/\./g, '').replace(',', '.');
    } else if (cleanPrice.includes(',') && !cleanPrice.includes('.')) {
      // Format: "460,50" - comma is decimal
      cleanPrice = cleanPrice.replace(',', '.');
    } else if (cleanPrice.includes('.') && !cleanPrice.includes(',')) {
      // Only dot present - determine if decimal or thousands
      const parts = cleanPrice.split('.');
      const lastPart = parts[parts.length - 1];
      
      // If last part has exactly 2 digits, it's likely decimal
      // If last part has 3 digits, it's likely thousands
      if (parts.length === 2 && lastPart.length === 2) {
        // Format: "460.50" - decimal format (keep as is)
      } else if (lastPart.length === 3) {
        // Format: "21.700" - thousands separator (remove dot)
        cleanPrice = cleanPrice.replace(/\./g, '');
      } else {
        // Format: "1.234.567" - multiple thousands separators
        cleanPrice = cleanPrice.replace(/\./g, '');
      }
    }
    
    // Parse the cleaned price
    numPrice = parseFloat(cleanPrice);
  } else {
    numPrice = Number(price);
  }
  
  // Validate the result
  if (isNaN(numPrice) || numPrice < 0 || numPrice > 1000000) {
    return '';
  }

  // Format using Brazilian locale
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numPrice);
}

/**
 * Formats a price difference/change
 * @param priceDiff - The price difference as a number
 * @returns Formatted price difference with + or - sign
 */
export function formatPriceDifference(priceDiff: number): string {
  const sign = priceDiff >= 0 ? '+' : '';
  return `${sign}${formatPrice(Math.abs(priceDiff))}`;
}

/**
 * Formats a percentage
 * @param percentage - The percentage as a number
 * @returns Formatted percentage string
 */
export function formatPercentage(percentage: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(percentage / 100);
}

/**
 * Formats a date to Brazilian format
 * @param date - Date string or Date object
 * @returns Formatted date string
 */
export function formatDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Formats a date with time to Brazilian format
 * @param date - Date string or Date object
 * @returns Formatted date and time string
 */
export function formatDateTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}