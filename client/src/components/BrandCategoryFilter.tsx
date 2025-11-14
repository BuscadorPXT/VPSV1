import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Filter, X } from "lucide-react";

interface BrandCategoryFilterProps {
  brands: string[];
  categories: string[];
  selectedBrands: string[];
  selectedCategories: string[];
  onBrandsChange: (brands: string[]) => void;
  onCategoriesChange: (categories: string[]) => void;
  onClear?: () => void;
}

export function BrandCategoryFilter({
  brands,
  categories,
  selectedBrands,
  selectedCategories,
  onBrandsChange,
  onCategoriesChange,
  onClear
}: BrandCategoryFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleBrandToggle = (brand: string) => {
    const updated = selectedBrands.includes(brand)
      ? selectedBrands.filter(b => b !== brand)
      : [...selectedBrands, brand];
    onBrandsChange(updated);
  };

  const handleCategoryToggle = (category: string) => {
    const updated = selectedCategories.includes(category)
      ? selectedCategories.filter(c => c !== category)
      : [...selectedCategories, category];
    onCategoriesChange(updated);
  };

  const totalFilters = selectedBrands.length + selectedCategories.length;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Filter className="h-4 w-4 mr-2" />
          Filtros
          {totalFilters > 0 && (
            <Badge className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
              {totalFilters}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Filtros</h4>
            {totalFilters > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onBrandsChange([]);
                  onCategoriesChange([]);
                  onClear?.();
                }}
              >
                <X className="h-4 w-4 mr-1" />
                Limpar
              </Button>
            )}
          </div>

          {brands.length > 0 && (
            <div>
              <h5 className="font-medium mb-2">Marcas</h5>
              <ScrollArea className="h-32">
                <div className="space-y-2">
                  {brands.map((brand) => (
                    <div key={brand} className="flex items-center space-x-2">
                      <Checkbox
                        id={`brand-${brand}`}
                        checked={selectedBrands.includes(brand)}
                        onCheckedChange={() => handleBrandToggle(brand)}
                      />
                      <label
                        htmlFor={`brand-${brand}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {brand}
                      </label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {categories.length > 0 && (
            <div>
              <h5 className="font-medium mb-2">Categorias</h5>
              <ScrollArea className="h-32">
                <div className="space-y-2">
                  {categories.map((category) => (
                    <div key={category} className="flex items-center space-x-2">
                      <Checkbox
                        id={`category-${category}`}
                        checked={selectedCategories.includes(category)}
                        onCheckedChange={() => handleCategoryToggle(category)}
                      />
                      <label
                        htmlFor={`category-${category}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {category}
                      </label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}