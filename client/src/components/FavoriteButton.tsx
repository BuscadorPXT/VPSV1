import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface FavoriteButtonProps {
  productId: number;
  className?: string;
}

export function FavoriteButton({ productId, className }: FavoriteButtonProps) {
  const [isFavorite, setIsFavorite] = useState(false);

  const handleToggleFavorite = () => {
    setIsFavorite(!isFavorite);
    // Here you would typically make an API call to save the favorite status
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleToggleFavorite}
      className={cn("p-1 h-6 w-6", className)}
    >
      <Heart
        className={cn(
          "h-4 w-4",
          isFavorite ? "fill-red-500 text-red-500" : "text-gray-400"
        )}
      />
    </Button>
  );
}