import { formatPrice } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface PriceCellProps {
  price: string | number;
  className?: string;
  animated?: boolean;
  showArrows?: boolean;
}

export function PriceCell({ price, className, animated = false, showArrows = false }: PriceCellProps) {
  const formattedPrice = formatPrice(price);
  
  return (
    <span className={cn(
      "font-mono whitespace-nowrap",
      animated && "transition-colors duration-200",
      className
    )}>
      {formattedPrice}
    </span>
  );
}

export function SimplePriceCell({ price, className }: { price: string | number; className?: string }) {
  const formattedPrice = formatPrice(price);
  
  return (
    <span className={cn("font-mono whitespace-nowrap", className)}>
      {formattedPrice}
    </span>
  );
}