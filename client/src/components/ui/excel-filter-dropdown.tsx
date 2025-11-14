import { useState, useEffect, useRef, useMemo } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

interface ExcelFilterDropdownProps {
  title: string;
  options: FilterOption[];
  selectedValues: string[];
  onSelectionChange: (selectedValues: string[]) => void;
  onApply: (selectedValues: string[]) => void;
  placeholder?: string;
  maxHeight?: number;
  showCounts?: boolean;
  disabled?: boolean;
}

export function ExcelFilterDropdown({
  title,
  options = [],
  selectedValues = [],
  onSelectionChange,
  onApply,
  placeholder = "Filtrar...",
  maxHeight = 400,
  showCounts = true,
  disabled = false
}: ExcelFilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [localSelection, setLocalSelection] = useState<string[]>(selectedValues);
  const [selectAll, setSelectAll] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      // Check if click is outside the dropdown container
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setIsOpen(false);
      }
    };

    // Only add listener when dropdown is open
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  // Sort options: empty values first, then alphabetically
  const sortedOptions = useMemo(() => {
    if (!options || options.length === 0) {
      console.log('🔍 ExcelFilterDropdown: No options provided', { title, optionsLength: options?.length });
      return [];
    }

    // Validate and clean options
    const validOptions = options.filter(opt => {
      const isValid = opt && typeof opt === 'object' && 
                     (opt.value !== undefined && opt.value !== null) &&
                     (opt.label !== undefined && opt.label !== null);
      if (!isValid) {
        console.warn('🔍 ExcelFilterDropdown: Invalid option filtered out', { title, option: opt });
      }
      return isValid;
    });

    if (validOptions.length === 0) {
      console.log('🔍 ExcelFilterDropdown: No valid options after filtering', { title, originalLength: options.length });
      return [];
    }

    const emptyOption = validOptions.find(opt => opt.value === "" || opt.value === null);
    const nonEmptyOptions = validOptions
      .filter(opt => opt.value !== "" && opt.value !== null)
      .sort((a, b) => {
        const labelA = (a.label || a.value || '').toString();
        const labelB = (b.label || b.value || '').toString();
        return labelA.localeCompare(labelB, 'pt-BR');
      });

    const result = emptyOption ? [emptyOption, ...nonEmptyOptions] : nonEmptyOptions;
    console.log('🔍 ExcelFilterDropdown: Sorted options', { title, totalOptions: result.length });
    return result;
  }, [options, title]);

  // Filter options based on search term
  const filteredOptions = useMemo(() => {
    if (!searchTerm || searchTerm.trim() === '') {
      console.log('🔍 ExcelFilterDropdown: No search term, returning all sorted options', { title, count: sortedOptions.length });
      return sortedOptions;
    }

    const searchLower = searchTerm.toLowerCase().trim();
    const filtered = sortedOptions.filter(option => {
      const label = (option.label || option.value || '').toString().toLowerCase();
      return label.includes(searchLower);
    });

    console.log('🔍 ExcelFilterDropdown: Filtered options', { title, searchTerm, filteredCount: filtered.length, totalCount: sortedOptions.length });
    return filtered;
  }, [sortedOptions, searchTerm, title]);

  // Update local selection when props change
  useEffect(() => {
    setLocalSelection(selectedValues);
  }, [selectedValues]);

  // Update select all state
  useEffect(() => {
    const allFilteredValues = filteredOptions.map(opt => opt.value);
    const allSelected = allFilteredValues.length > 0 && 
      allFilteredValues.every(value => localSelection.includes(value));
    setSelectAll(allSelected);
  }, [localSelection, filteredOptions]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allValues = filteredOptions.map(opt => opt.value);
      const uniqueValues = [...localSelection];
      allValues.forEach(value => {
        if (!uniqueValues.includes(value)) {
          uniqueValues.push(value);
        }
      });
      setLocalSelection(uniqueValues);
      onSelectionChange(uniqueValues);
      onApply(uniqueValues);
    } else {
      const filteredValues = filteredOptions.map(opt => opt.value);
      const newSelection = localSelection.filter(val => !filteredValues.includes(val));
      setLocalSelection(newSelection);
      onSelectionChange(newSelection);
      onApply(newSelection);
    }
  };

  const handleOptionToggle = (value: string) => {
    const newSelection = localSelection.includes(value)
      ? localSelection.filter(v => v !== value)
      : [...localSelection, value];

    setLocalSelection(newSelection);
    onSelectionChange(newSelection);
    onApply(newSelection);
  };

  const handleClearAll = () => {
    setLocalSelection([]);
    onSelectionChange([]);
    onApply([]);
  };

  const getDisplayText = () => {
    const selected = selectedValues.length;
    const total = options.length;

    if (selected === 0) return placeholder || "Todos";
    if (selected === total) return "Todos";
    if (selected === 1) {
      const option = options.find(opt => opt.value === selectedValues[0]);
      return option ? option.label : `${selected} selecionado`;
    }
    return `${selected} selecionados`;
  };

  const hasActiveFilters = selectedValues.length > 0 && selectedValues.length < options.length;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={`
            justify-between h-10 px-2 sm:px-3 text-xs font-normal w-full
            ${hasActiveFilters 
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300' 
              : 'border-border hover:bg-accent'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          disabled={disabled}
        >
          <span className="truncate text-left flex-1">{getDisplayText()}</span>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-50 ml-1" />
        </Button>
      </PopoverTrigger>
      <PopoverContent ref={dropdownRef} className="w-72 p-0" align="start">
        <div className="p-3 border-b">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-sm">{title}</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder={placeholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-7 h-8 text-xs"
            />
          </div>
        </div>

        <div className="p-2">
          <div className="flex items-center space-x-2 p-2 hover:bg-accent rounded-sm">
            <Checkbox
              id="select-all"
              checked={selectAll}
              onCheckedChange={handleSelectAll}
              className="h-4 w-4"
            />
            <label
              htmlFor="select-all"
              className="text-sm font-medium cursor-pointer flex-1"
            >
              Selecionar Tudo
            </label>
          </div>

          <Separator className="my-2" />

          <ScrollArea className="h-64" style={{ isolation: 'isolate' }}>
            <div className="space-y-1" style={{ isolation: 'isolate' }}>
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option, index) => {
                  const isSelected = localSelection.includes(option.value);
                  const displayLabel = option.value === "" || option.value === null 
                    ? "(Vazias)" 
                    : (option.label || option.value || 'Sem nome');

                  return (
                    <div
                      key={`${option.value}-${index}`}
                      className="flex items-center space-x-2 p-2 hover:bg-accent rounded-sm cursor-pointer"
                      onClick={() => handleOptionToggle(option.value)}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleOptionToggle(option.value)}
                        className="h-4 w-4"
                      />
                      <div className="flex-1 flex items-center justify-between">
                        <span className="text-sm truncate">
                          {displayLabel}
                        </span>
                        {showCounts && option.count !== undefined && (
                          <span className="text-xs text-muted-foreground ml-2">
                            ({option.count})
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  <div>Nenhuma opção encontrada</div>
                  {searchTerm && (
                    <div className="text-xs mt-1">
                      Busca: "{searchTerm}" em {sortedOptions.length} opções
                    </div>
                  )}
                  {!searchTerm && sortedOptions.length === 0 && (
                    <div className="text-xs mt-1">
                      Nenhuma opção disponível para {title}
                    </div>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        <Separator />

        <div className="p-3 flex justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="text-xs"
          >
            Limpar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="text-xs"
          >
            Fechar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}