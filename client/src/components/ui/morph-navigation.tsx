import { useState } from 'react';
import { Smartphone, Watch, Tablet, Laptop } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MorphNavigation() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categories = [
    { id: 'iphone', icon: Smartphone, label: 'iPhone', color: 'blue' },
    { id: 'watch', icon: Watch, label: 'Apple Watch', color: 'green' },
    { id: 'ipad', icon: Tablet, label: 'iPad', color: 'purple' },
    { id: 'mac', icon: Laptop, label: 'Mac', color: 'orange' }
  ];

  return (
    <div className="flex justify-center items-center gap-8 py-8">
      {categories.map((category) => {
        const Icon = category.icon;
        return (
          <div
            key={category.id}
            className={cn(
              "relative flex flex-col items-center p-6 rounded-2xl cursor-pointer transition-all duration-300",
              "hover:scale-110 hover:shadow-xl",
              activeCategory === category.id ? "scale-110 shadow-xl" : "",
              `hover:bg-${category.color}-50`
            )}
            onMouseEnter={() => setActiveCategory(category.id)}
            onMouseLeave={() => setActiveCategory(null)}
          >
            <div
              className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center mb-3 transition-all duration-300",
                `bg-${category.color}-100 text-${category.color}-600`,
                activeCategory === category.id ? `bg-${category.color}-600 text-white` : ""
              )}
            >
              <Icon className="w-8 h-8" />
            </div>
            <span className="text-sm font-medium text-gray-700">
              {category.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}