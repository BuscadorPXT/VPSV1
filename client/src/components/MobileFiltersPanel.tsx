
import React from 'react';
import { X, Filter, ChevronRight, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useIsMobile } from '@/hooks/use-mobile';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface MobileFiltersPanelProps {
  isOpen: boolean;
  onClose: () => void;
  filters: {
    categories: string[];
    capacities: string[];
    regions: string[];
    colors: string[];
    suppliers: string[];
  };
  selectedFilters: {
    categories: string[];
    capacities: string[];
    regions: string[];
    colors: string[];
    suppliers: string[];
  };
  onFilterChange: (filterType: string, values: string[]) => void;
  productCount: number;
}

interface FilterSection {
  key: string;
  title: string;
  icon: string;
  options: string[];
  selected: string[];
}

export function MobileFiltersPanel({ 
  isOpen, 
  onClose, 
  filters, 
  selectedFilters, 
  onFilterChange,
  productCount 
}: MobileFiltersPanelProps) {
  const { safeAreaInsets } = useIsMobile();
  const [activeSection, setActiveSection] = React.useState<string | null>(null);

  const filterSections: FilterSection[] = [
    {
      key: 'categories',
      title: 'Categoria',
      icon: '📱',
      options: filters.categories,
      selected: selectedFilters.categories
    },
    {
      key: 'capacities',
      title: 'Capacidade',
      icon: '💾',
      options: filters.capacities,
      selected: selectedFilters.capacities
    },
    {
      key: 'regions',
      title: 'Região',
      icon: '🌍',
      options: filters.regions,
      selected: selectedFilters.regions
    },
    {
      key: 'colors',
      title: 'Cor',
      icon: '🎨',
      options: filters.colors,
      selected: selectedFilters.colors
    },
    {
      key: 'suppliers',
      title: 'Fornecedor',
      icon: '🏪',
      options: filters.suppliers,
      selected: selectedFilters.suppliers
    }
  ];

  const clearAllFilters = () => {
    Object.keys(selectedFilters).forEach(filterType => {
      onFilterChange(filterType, []);
    });
  };

  const hasActiveFilters = Object.values(selectedFilters).some(filters => filters.length > 0);
  const totalActiveFilters = Object.values(selectedFilters).reduce((sum, filters) => sum + filters.length, 0);

  const handleOptionToggle = (sectionKey: string, option: string) => {
    const currentSelected = selectedFilters[sectionKey as keyof typeof selectedFilters];
    const newSelected = currentSelected.includes(option)
      ? currentSelected.filter(item => item !== option)
      : [...currentSelected, option];
    
    onFilterChange(sectionKey, newSelected);
  };

  const renderMainMenu = () => (
    <div className="space-y-3">
      {filterSections.map((section) => (
        <motion.button
          key={section.key}
          onClick={() => setActiveSection(section.key)}
          className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">{section.icon}</span>
            <div className="text-left">
              <span className="font-medium text-slate-900 dark:text-white">
                {section.title}
              </span>
              {section.selected.length > 0 && (
                <div className="flex items-center gap-1 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {section.selected.length} selecionado{section.selected.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
              )}
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-400" />
        </motion.button>
      ))}
    </div>
  );

  const renderFilterSection = (section: FilterSection) => (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={() => setActiveSection(null)}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5 rotate-180 text-slate-600 dark:text-slate-400" />
        </button>
        <span className="text-xl">{section.icon}</span>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          {section.title}
        </h3>
      </div>

      {/* Options */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {section.options.map((option) => {
          const isSelected = section.selected.includes(option);
          return (
            <motion.div
              key={option}
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg transition-colors cursor-pointer",
                isSelected 
                  ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800" 
                  : "bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700"
              )}
              onClick={() => handleOptionToggle(section.key, option)}
              whileTap={{ scale: 0.98 }}
            >
              <Checkbox
                checked={isSelected}
                onChange={() => {}} // Controlled by parent click
                className="pointer-events-none"
              />
              <span className={cn(
                "text-sm flex-1",
                isSelected 
                  ? "text-blue-900 dark:text-blue-100 font-medium" 
                  : "text-slate-700 dark:text-slate-300"
              )}>
                {option}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          className="fixed inset-x-0 bottom-0 bg-white dark:bg-slate-900 rounded-t-2xl shadow-2xl max-h-[85vh] flex flex-col"
          style={{ 
            paddingBottom: `max(${safeAreaInsets.bottom}px, 16px)`
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-t-2xl">
            <div className="flex items-center space-x-3">
              <Filter className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {activeSection ? filterSections.find(s => s.key === activeSection)?.title : 'Filtros'}
              </h2>
              {!activeSection && (
                <Badge variant="outline" className="text-xs">
                  {productCount} produtos
                </Badge>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              {hasActiveFilters && !activeSection && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearAllFilters}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <RotateCcw className="w-4 h-4 mr-1" />
                  Limpar
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Active filters summary */}
          {hasActiveFilters && !activeSection && (
            <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                <span className="font-medium">
                  {totalActiveFilters} filtro{totalActiveFilters !== 1 ? 's' : ''} ativo{totalActiveFilters !== 1 ? 's' : ''}
                </span>
                <span>•</span>
                <span>{productCount} produtos encontrados</span>
              </div>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            <AnimatePresence mode="wait">
              {activeSection ? (
                <motion.div
                  key={activeSection}
                  initial={{ x: 300, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -300, opacity: 0 }}
                  transition={{ type: "spring", damping: 30, stiffness: 300 }}
                >
                  {renderFilterSection(filterSections.find(s => s.key === activeSection)!)}
                </motion.div>
              ) : (
                <motion.div
                  key="main"
                  initial={{ x: -300, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 300, opacity: 0 }}
                  transition={{ type: "spring", damping: 30, stiffness: 300 }}
                >
                  {renderMainMenu()}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="border-t border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-900">
            <Button 
              onClick={onClose}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-base font-medium"
              size="lg"
            >
              {activeSection ? 'Continuar' : `Ver ${productCount} Produtos`}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
