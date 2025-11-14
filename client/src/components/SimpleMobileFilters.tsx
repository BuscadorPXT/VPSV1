
import React, { useState } from 'react';
import { X, Filter, Check, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SimpleMobileFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  availableFilters: {
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
  onApplyFilters: () => void;
  onClearFilters: () => void;
  productCount: number;
}

const filterSections = [
  { key: 'categories', title: 'Categoria', icon: '📱' },
  { key: 'capacities', title: 'Capacidade', icon: '💾' },
  { key: 'regions', title: 'Região', icon: '🌎' },
  { key: 'colors', title: 'Cor', icon: '🎨' },
  { key: 'suppliers', title: 'Fornecedor', icon: '🏪' }
];

export function SimpleMobileFilters({
  isOpen,
  onClose,
  availableFilters,
  selectedFilters,
  onFilterChange,
  onApplyFilters,
  onClearFilters,
  productCount
}: SimpleMobileFiltersProps) {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // Debug logging
  React.useEffect(() => {
    console.log('🔍 SimpleMobileFilters: Component state changed', {
      isOpen,
      availableFilters,
      selectedFilters,
      productCount,
      activeSection,
      timestamp: new Date().toISOString()
    });
  }, [isOpen, availableFilters, selectedFilters, productCount, activeSection]);

  const toggleFilter = (filterType: string, value: string) => {
    const currentValues = selectedFilters[filterType as keyof typeof selectedFilters] || [];
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];
    
    onFilterChange(filterType, newValues);
  };

  const getTotalActiveFilters = () => {
    return Object.values(selectedFilters).reduce((total, filters) => total + filters.length, 0);
  };

  const handleApply = () => {
    onApplyFilters();
    onClose();
  };

  const handleClear = () => {
    onClearFilters();
    onClose();
  };

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('🔘 SimpleMobileFilters: Backdrop clicked, closing modal');
              onClose();
            }}
          />

          {/* Filter Panel */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md mx-auto bg-white dark:bg-slate-900 rounded-t-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col border-t-4 border-blue-500"
            onClick={(e) => e.stopPropagation()}
            style={{ 
              position: 'relative',
              zIndex: 10000,
              marginBottom: 0
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <Filter className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Filtros
                </h2>
                {getTotalActiveFilters() > 0 && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-600">
                    {getTotalActiveFilters()}
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="rounded-full p-2"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {activeSection ? (
                // Detail view for specific filter
                <div className="p-4">
                  <Button
                    variant="ghost"
                    onClick={() => setActiveSection(null)}
                    className="mb-4 p-2"
                  >
                    ← Voltar
                  </Button>
                  
                  <h3 className="text-lg font-medium mb-4">
                    {filterSections.find(f => f.key === activeSection)?.title}
                  </h3>

                  <div className="space-y-2">
                    {availableFilters[activeSection as keyof typeof availableFilters]?.map((option) => {
                      const isSelected = selectedFilters[activeSection as keyof typeof selectedFilters]?.includes(option);
                      
                      return (
                        <button
                          key={option}
                          onClick={() => toggleFilter(activeSection, option)}
                          className={cn(
                            "w-full flex items-center justify-between p-3 rounded-lg border transition-all",
                            isSelected
                              ? "bg-blue-50 border-blue-200 text-blue-700"
                              : "bg-white border-slate-200 hover:bg-slate-50"
                          )}
                        >
                          <span className="text-left">{option}</span>
                          {isSelected && (
                            <Check className="w-4 h-4 text-blue-600" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                // Main filter sections
                <div className="p-4 space-y-3">
                  {filterSections.map((section) => {
                    const selectedCount = selectedFilters[section.key as keyof typeof selectedFilters]?.length || 0;
                    const availableCount = availableFilters[section.key as keyof typeof availableFilters]?.length || 0;
                    
                    return (
                      <button
                        key={section.key}
                        onClick={() => setActiveSection(section.key)}
                        className="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{section.icon}</span>
                          <div className="text-left">
                            <div className="font-medium text-slate-900 dark:text-white">
                              {section.title}
                            </div>
                            <div className="text-sm text-slate-500 dark:text-slate-400">
                              {availableCount} opções disponíveis
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {selectedCount > 0 && (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-600">
                              {selectedCount}
                            </Badge>
                          )}
                          <span className="text-slate-400">›</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleClear}
                  className="flex-1 h-12"
                  disabled={getTotalActiveFilters() === 0}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Limpar
                </Button>
                <Button
                  onClick={handleApply}
                  className="flex-1 h-12 bg-blue-600 hover:bg-blue-700"
                >
                  Ver {productCount} produtos
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
