"use client"

import * as React from "react"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarIcon, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface ElegantDateSelectorProps {
  selectedDate: string
  availableDates: string[]
  onDateChange: (date: string) => void
  className?: string
  disabled?: boolean
  placeholder?: string
}

export function ElegantDateSelector({
  selectedDate,
  availableDates = [],
  onDateChange,
  className,
  disabled,
  placeholder = "Selecione uma data"
}: ElegantDateSelectorProps) {
  const [open, setOpen] = React.useState(false)
  const [currentMonth, setCurrentMonth] = React.useState<Date>(new Date())
  
  // Debug logs
  React.useEffect(() => {
    console.log('🔍 ElegantDateSelector props:', {
      selectedDate,
      availableDates: availableDates.length,
      disabled
    })
  }, [selectedDate, availableDates, disabled])

  // Convert string dates (DD-MM format) to proper Date objects for calendar
  const convertToDate = (dateStr: string): Date => {
    const [day, month] = dateStr.split('-').map(Number)
    const year = new Date().getFullYear()
    return new Date(year, month - 1, day)
  }

  // Convert Date back to DD-MM format
  const convertFromDate = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    return `${day}-${month}`
  }

  // Get the most recent date as default
  const getMostRecentDate = (): string => {
    if (!availableDates.length) return ''

    // Filter out 'all' and sort dates to get the most recent
    const validDates = availableDates.filter(date => date !== 'all')
    if (!validDates.length) return ''

    // Sort dates and get the most recent
    const sortedDates = [...validDates].sort((a, b) => {
      const [dayA, monthA] = a.split('-').map(Number)
      const [dayB, monthB] = b.split('-').map(Number)

      // Compare by month first, then by day
      if (monthA !== monthB) return monthB - monthA
      return dayB - dayA
    })

    return sortedDates[0]
  }

  // Auto-select most recent date if no valid date is selected
  React.useEffect(() => {
    if (availableDates.length === 0) return

    const validDates = availableDates.filter(date => date !== 'all')
    const isValidSelection = selectedDate && validDates.includes(selectedDate)

    if (!isValidSelection) {
      const mostRecent = getMostRecentDate()
      if (mostRecent && mostRecent !== selectedDate) {
        onDateChange(mostRecent)
      }
    }
  }, [availableDates, selectedDate, onDateChange])

  // Set initial month based on available dates
  React.useEffect(() => {
    if (availableDates.length > 0) {
      const validDates = availableDates.filter(date => date !== 'all')
      if (validDates.length > 0) {
        const mostRecentDate = convertToDate(validDates[0])
        setCurrentMonth(mostRecentDate)
      }
    }
  }, [availableDates])

  const currentDate = React.useMemo(() => {
    return selectedDate ? convertToDate(selectedDate) : null
  }, [selectedDate])

  const handleDateSelect = React.useCallback((date: Date | undefined) => {
    if (date) {
      const dateStr = convertFromDate(date)
      console.log('📅 Date selected:', dateStr, 'Available dates:', availableDates)
      // Only allow selection of available dates
      const validDates = availableDates.filter(d => d !== 'all')
      if (validDates.includes(dateStr)) {
        console.log('✅ Valid date selected, calling onDateChange')
        onDateChange(dateStr)
        setOpen(false)
      } else {
        console.log('❌ Invalid date selected, not in available dates')
      }
    }
  }, [onDateChange, availableDates])

  // Memoize available dates for calendar display
  const availableDateObjects = React.useMemo(() => {
    return availableDates
      .filter(date => date !== 'all')
      .map(convertToDate)
  }, [availableDates])

  const formatDisplayDate = React.useCallback((dateStr: string): string => {    
    const parts = dateStr.split('-')
    if (parts.length !== 2) return dateStr

    const [day, month] = parts
    const monthNames = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ]

    const monthIndex = parseInt(month) - 1
    if (monthIndex < 0 || monthIndex >= monthNames.length) return dateStr

    return `${day} ${monthNames[monthIndex]}`
  }, [])

  // Navigation functions
  const goToPreviousMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  // Check if there are available dates in current month
  const hasAvailableDatesInMonth = React.useMemo(() => {
    return availableDateObjects.some(date => 
      date.getMonth() === currentMonth.getMonth() && 
      date.getFullYear() === currentMonth.getFullYear()
    )
  }, [availableDateObjects, currentMonth])

  // Get months with available dates for quick navigation
  const monthsWithDates = React.useMemo(() => {
    const months = new Set<string>()
    availableDateObjects.forEach(date => {
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`
      months.add(monthKey)
    })
    return Array.from(months).map(key => {
      const [year, month] = key.split('-').map(Number)
      return new Date(year, month, 1)
    }).sort((a, b) => b.getTime() - a.getTime()) // Most recent first
  }, [availableDateObjects])

  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-muted-foreground">
        📅 Data
      </label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-between text-left font-normal h-10",
              "border-border/50 hover:border-border hover:bg-accent/50",
              "focus:ring-2 focus:ring-primary/20 focus:border-primary",
              !currentDate && "text-muted-foreground",
              className
            )}
            disabled={disabled}
          >
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <span>
                {selectedDate 
                  ? (
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      {formatDisplayDate(selectedDate)} {selectedDate === getMostRecentDate() ? '' : ''}
                    </span>
                  )
                  : placeholder
                }
              </span>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          {availableDateObjects.length > 0 && (
            <div className="p-3">
              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPreviousMonth}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="font-medium text-sm">
                  {currentMonth.toLocaleDateString('pt-BR', { 
                    month: 'long', 
                    year: 'numeric' 
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNextMonth}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Quick month jump for months with data */}
              {monthsWithDates.length > 1 && (
                <div className="mb-3 flex flex-wrap gap-1">
                  {monthsWithDates.slice(0, 6).map((monthDate, index) => (
                    <Button
                      key={index}
                      variant={
                        monthDate.getMonth() === currentMonth.getMonth() && 
                        monthDate.getFullYear() === currentMonth.getFullYear() 
                          ? "default" : "outline"
                      }
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => setCurrentMonth(monthDate)}
                    >
                      {monthDate.toLocaleDateString('pt-BR', { month: 'short' })}
                    </Button>
                  ))}
                </div>
              )}

              {/* Calendar */}
              <div className="calendar-wrapper">
                <style>{`
                  .calendar-wrapper [data-selected="true"] button {
                    background-color: #16a34a !important;
                    color: white !important;
                    font-weight: bold !important;
                    border: 2px solid #15803d !important;
                    box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.3) !important;
                  }
                  .calendar-wrapper [data-selected="true"] button:hover {
                    background-color: #15803d !important;
                    color: white !important;
                  }
                  .calendar-wrapper .available-date button {
                    background-color: hsl(var(--muted)) !important;
                    color: hsl(var(--muted-foreground)) !important;
                    border: 1px solid hsl(var(--border)) !important;
                  }
                `}</style>
                <Calendar
                  mode="single"
                  selected={currentDate ?? undefined}
                  onSelect={handleDateSelect}
                  month={currentMonth}
                  onMonthChange={setCurrentMonth}
                  className="rounded-lg border-0"
                  classNames={{
                    months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                    month: "space-y-4",
                    caption: "flex justify-center pt-1 relative items-center hidden",
                    caption_label: "text-sm font-medium",
                    nav: "space-x-1 flex items-center hidden",
                    nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                    nav_button_previous: "absolute left-1",
                    nav_button_next: "absolute right-1",
                    table: "w-full border-collapse space-y-1",
                    head_row: "flex",
                    head_cell: "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem]",
                    row: "flex w-full mt-2",
                    cell: "relative p-0 text-center text-sm",
                    day: "h-8 w-8 p-0 font-normal rounded-md hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground text-sm transition-colors",
                    day_selected: "bg-green-600 text-white hover:bg-green-700 focus:bg-green-700 font-bold",
                    day_today: "bg-accent text-accent-foreground font-medium",
                    day_outside: "text-muted-foreground opacity-50",
                    day_disabled: "text-muted-foreground opacity-50 cursor-not-allowed",
                    day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                    day_hidden: "invisible",
                  }}
                  modifiers={{
                    available: availableDateObjects,
                    unavailable: (date) => {
                      return !availableDateObjects.some(availableDate => 
                        availableDate.getDate() === date.getDate() &&
                        availableDate.getMonth() === date.getMonth() &&
                        availableDate.getFullYear() === date.getFullYear()
                      )
                    }
                  }}
                  modifiersClassNames={{
                    available: "available-date",
                    unavailable: "opacity-30 cursor-not-allowed"
                  }}
                  disabled={(date) => {
                    // Don't disable if no available dates loaded yet
                    if (availableDateObjects.length === 0) return false
                    
                    return !availableDateObjects.some(availableDate => 
                      availableDate.getDate() === date.getDate() &&
                      availableDate.getMonth() === date.getMonth() &&
                      availableDate.getFullYear() === date.getFullYear()
                    )
                  }}
                />
              </div>

              {/* No dates in current month message */}
              {!hasAvailableDatesInMonth && (
                <div className="text-center text-sm text-muted-foreground mt-2 p-2 bg-muted/50 rounded">
                  Nenhuma data disponível neste mês
                </div>
              )}
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}