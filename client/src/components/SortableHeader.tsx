
import { ChevronUp, ChevronDown } from 'lucide-react';
import { SortField, SortDirection } from '../types/productTypes';

interface SortableHeaderProps {
  field: SortField;
  currentSortField: SortField;
  currentSortDirection: SortDirection;
  onSort: (field: SortField) => void;
  children: React.ReactNode;
  className?: string;
}

export function SortableHeader({
  field,
  currentSortField,
  currentSortDirection,
  onSort,
  children,
  className = ''
}: SortableHeaderProps) {
  const isActive = currentSortField === field;
  
  return (
    <th 
      className={`px-4 py-3 text-left text-sm font-medium text-gray-600 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 select-none ${className}`}
      onClick={() => onSort(field)}
    >
      <div className="flex items-center justify-between">
        {children}
        <div className="flex flex-col ml-1">
          <ChevronUp 
            size={12} 
            className={`${isActive && currentSortDirection === 'asc' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`}
          />
          <ChevronDown 
            size={12} 
            className={`${isActive && currentSortDirection === 'desc' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'} -mt-1`}
          />
        </div>
      </div>
    </th>
  );
}
