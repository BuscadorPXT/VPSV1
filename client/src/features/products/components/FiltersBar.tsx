
import { useState } from 'react';
import { Calendar, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface FiltersBarProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
  availableDates?: string[];
  className?: string;
}

export function FiltersBar({ selectedDate, onDateChange, availableDates, className }: FiltersBarProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Converter string de data DD-MM para Date object
  const parseDate = (dateStr: string): Date | undefined => {
    if (!dateStr || dateStr === 'all') return undefined;
    
    const [day, month] = dateStr.split('-');
    const currentYear = new Date().getFullYear();
    return new Date(currentYear, parseInt(month) - 1, parseInt(day));
  };

  // Converter Date object para string DD-MM
  const formatDate = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}-${month}`;
  };

  const selectedDateObj = parseDate(selectedDate);

  const handleDateSelect = (date: Date | undefined) => {
    console.log('📅 FiltersBar date selected:', date)
    if (date) {
      const formattedDate = formatDate(date);
      console.log('📅 Formatted date:', formattedDate)
      onDateChange(formattedDate);
    } else {
      console.log('📅 Clearing date selection')
      onDateChange('all');
    }
    setIsOpen(false);
  };

  const handleTodayClick = () => {
    const today = new Date();
    const todayStr = formatDate(today);
    onDateChange(todayStr);
    setIsOpen(false);
  };

  const getDisplayDate = () => {
    if (!selectedDate || selectedDate === 'all') {
      return 'Todas as datas';
    }
    
    if (selectedDateObj) {
      return format(selectedDateObj, "dd 'de' MMMM", { locale: ptBR });
    }
    
    return selectedDate;
  };

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <div className="flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Filtrar por data:
        </span>
      </div>

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "justify-start text-left font-normal min-w-[200px]",
              !selectedDateObj && "text-muted-foreground"
            )}
          >
            <Calendar className="mr-2 h-4 w-4" />
            {getDisplayDate()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-3 border-b">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTodayClick}
                className="flex-1"
              >
                Hoje
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDateSelect(undefined)}
                className="flex-1"
              >
                Todas
              </Button>
            </div>
          </div>
          <CalendarComponent
            mode="single"
            selected={selectedDateObj}
            onSelect={handleDateSelect}
            disabled={(date) => {
              // Allow all dates - remove future date restriction for testing
              return false;
            }}
            initialFocus
            locale={ptBR}
          />
          {availableDates && availableDates.length > 0 && (
            <div className="p-3 border-t">
              <p className="text-xs text-gray-500 mb-2">Datas disponíveis:</p>
              <div className="flex flex-wrap gap-1">
                {availableDates.slice(0, 5).map((date) => (
                  <Button
                    key={date}
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      onDateChange(date);
                      setIsOpen(false);
                    }}
                    className="text-xs h-6 px-2"
                  >
                    {date}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
