import React from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  rating?: number;
  averageRating?: string | number;
  ratingCount?: number;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showEmpty?: boolean;
  className?: string;
  onRatingChange?: (rating: number) => void;
}

export function StarRating({
  rating,
  averageRating,
  ratingCount = 0,
  readonly = true,
  size = 'md',
  showEmpty = true,
  className,
  onRatingChange
}: StarRatingProps) {
  // Determine which rating to use with better validation
  const displayRating = React.useMemo(() => {
    // Priority: rating prop > averageRating prop
    if (rating !== undefined && rating > 0) return rating;

    if (averageRating !== undefined && averageRating !== null) {
      const parsed = typeof averageRating === 'string' ? parseFloat(averageRating) : Number(averageRating);
      if (!isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }

    return 0;
  }, [rating, averageRating]);

  const [hoveredStar, setHoveredStar] = React.useState<number | null>(null);

  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4', 
    lg: 'h-5 w-5',
    xl: 'h-6 w-6'
  };

  const handleStarClick = (starIndex: number) => {
    if (!readonly && onRatingChange) {
      onRatingChange(starIndex + 1);
    }
  };

  const handleStarHover = (starIndex: number) => {
    if (!readonly) {
      setHoveredStar(starIndex);
    }
  };

  const handleMouseLeave = () => {
    if (!readonly) {
      setHoveredStar(null);
    }
  };

  // Don't render if no valid rating and showEmpty is false
  if (!showEmpty && displayRating <= 0) {
    return null;
  }

  // Special case: when there's no rating but we want to show interactive empty stars
  const showInteractiveEmpty = displayRating <= 0 && !readonly;

  // Debug log (remove in production)
  console.log('⭐ StarRating Debug:', {
    rating,
    averageRating,
    ratingCount,
    displayRating,
    readonly
  });

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <div className="flex items-center" onMouseLeave={handleMouseLeave}>
        {[...Array(5)].map((_, index) => {
          // For interactive empty stars (no rating, not readonly)
          if (showInteractiveEmpty) {
            const isHovered = hoveredStar !== null && index <= hoveredStar;
            
            return (
              <button
                key={index}
                type="button"
                className={cn(
                  'relative transition-all duration-200 ease-in-out',
                  'hover:scale-110 cursor-pointer'
                )}
                onClick={() => handleStarClick(index)}
                onMouseEnter={() => handleStarHover(index)}
              >
                <Star
                  className={cn(
                    sizeClasses[size],
                    'transition-all duration-200',
                    isHovered
                      ? 'fill-yellow-400 text-yellow-400 drop-shadow-sm'
                      : 'fill-gray-200 text-gray-300 hover:fill-gray-300 hover:text-gray-400'
                  )}
                />
              </button>
            );
          }

          // Normal star logic for existing ratings
          const isFilled = readonly 
            ? index < Math.floor(displayRating)
            : index <= (hoveredStar ?? displayRating - 1);

          const isHalfFilled = readonly && 
            index === Math.floor(displayRating) && 
            displayRating % 1 >= 0.5;

          return (
            <button
              key={index}
              type="button"
              disabled={readonly}
              className={cn(
                'relative transition-colors',
                !readonly && 'hover:scale-110 cursor-pointer',
                readonly && 'cursor-default'
              )}
              onClick={() => handleStarClick(index)}
              onMouseEnter={() => handleStarHover(index)}
            >
              <Star
                className={cn(
                  sizeClasses[size],
                  'transition-colors',
                  isFilled || isHalfFilled
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'fill-gray-200 text-gray-300'
                )}
              />
              {isHalfFilled && (
                <Star
                  className={cn(
                    sizeClasses[size],
                    'absolute top-0 left-0 fill-yellow-400 text-yellow-400'
                  )}
                  style={{
                    clipPath: 'polygon(0 0, 50% 0, 50% 100%, 0 100%)'
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {readonly && displayRating > 0 && (
        <span className="text-xs text-gray-600 ml-1">
          {displayRating.toFixed(1)} {ratingCount > 0 && `(${ratingCount})`}
        </span>
      )}

      {showInteractiveEmpty && (
        <span className="text-xs text-gray-400 ml-1">
          Clique para avaliar
        </span>
      )}
    </div>
  );
}