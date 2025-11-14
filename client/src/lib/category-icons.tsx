import { 
  Smartphone, 
  Laptop, 
  Tablet, 
  Watch, 
  Headphones, 
  Cable, 
  Package,
  MapPin,
  Tv,
  PenTool
} from "lucide-react";

export type CategoryCode = "IPH" | "MCB" | "IPAD" | "RLG" | "PODS" | "ACSS" | "CAT" | "AIRTAG" | "FIRE TV STICK" | "APPLE PENCIL";

interface CategoryInfo {
  icon: React.ComponentType<{ className?: string }>;
  name: string;
  color: string;
  emoji: string;
}

export const categoryMapping: Record<CategoryCode, CategoryInfo> = {
  IPH: {
    icon: Smartphone,
    name: "iPhone",
    color: "text-blue-600 dark:text-blue-400",
    emoji: "📱"
  },
  MCB: {
    icon: Laptop,
    name: "MacBook",
    color: "text-purple-600 dark:text-purple-400",
    emoji: "💻"
  },
  IPAD: {
    icon: Tablet,
    name: "iPad",
    color: "text-green-600 dark:text-green-400",
    emoji: "📟"
  },
  RLG: {
    icon: Watch,
    name: "Apple Watch",
    color: "text-orange-600 dark:text-orange-400",
    emoji: "⌚"
  },
  PODS: {
    icon: Headphones,
    name: "AirPods",
    color: "text-pink-600 dark:text-pink-400",
    emoji: "🎧"
  },
  ACSS: {
    icon: Cable,
    name: "Acessórios",
    color: "text-amber-600 dark:text-amber-400",
    emoji: "⚡"
  },
  AIRTAG: {
    icon: MapPin,
    name: "AirTag",
    color: "text-cyan-600 dark:text-cyan-400",
    emoji: "📍"
  },
  "FIRE TV STICK": {
    icon: Tv,
    name: "Fire TV Stick",
    color: "text-red-600 dark:text-red-400",
    emoji: "📺"
  },
  "APPLE PENCIL": {
    icon: PenTool,
    name: "Apple Pencil",
    color: "text-gray-600 dark:text-gray-400",
    emoji: "✏️"
  },
  CAT: {
    icon: Package,
    name: "Categoria Genérica",
    color: "text-slate-600 dark:text-slate-400",
    emoji: "📦"
  }
};

export function getCategoryIcon(category: string | null | undefined): CategoryInfo {
  if (!category) {
    return categoryMapping.CAT;
  }
  
  const categoryCode = category.trim().toUpperCase() as CategoryCode;
  return categoryMapping[categoryCode] || categoryMapping.CAT;
}

export function CategoryIcon({ 
  category, 
  size = "h-4 w-4",
  showTooltip = false,
  useEmoji = false
}: { 
  category: string | null | undefined;
  size?: string;
  showTooltip?: boolean;
  useEmoji?: boolean;
}) {
  const categoryInfo = getCategoryIcon(category);
  const IconComponent = categoryInfo.icon;
  
  if (useEmoji) {
    return (
      <div 
        className="flex items-center" 
        title={showTooltip ? categoryInfo.name : undefined}
      >
        <span className="text-sm">
          {categoryInfo.emoji}
        </span>
      </div>
    );
  }
  
  return (
    <div 
      className="flex items-center" 
      title={showTooltip ? categoryInfo.name : undefined}
    >
      <IconComponent 
        className={`${size} ${categoryInfo.color}`}
      />
    </div>
  );
}