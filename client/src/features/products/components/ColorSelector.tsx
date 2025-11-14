import { getColorInfo } from '@/lib/color-mapping';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ColorOption {
  value: string;
  enabled: boolean;
}

interface AppleColorOption {
  value: string;
  available: boolean;
  label: string;
}

interface ColorSelectorProps {
  colors?: string[] | AppleColorOption[];
  colorOptions?: ColorOption[];
  value: string;
  onValueChange: (value: string) => void;
  compact?: boolean;
}

export function ColorSelector({ colors = [], colorOptions, value, onValueChange, compact = false }: ColorSelectorProps) {
  // Use colorOptions if available (with enabled/disabled state), otherwise process colors based on type
  let colorsToRender: { value: string; enabled: boolean; label?: string }[] = [];
  
  if (colorOptions && Array.isArray(colorOptions)) {
    colorsToRender = colorOptions.map(option => ({ ...option, enabled: option.enabled }));
  } else if (Array.isArray(colors) && colors.length > 0) {
    // Check if it's AppleColorOption[] or string[]
    if (typeof colors[0] === 'object' && colors[0] !== null && 'available' in colors[0]) {
      // It's AppleColorOption[]
      colorsToRender = (colors as AppleColorOption[]).map(appleColor => ({
        value: appleColor.value,
        enabled: appleColor.available,
        label: appleColor.label
      }));
    } else {
      // It's string[]
      colorsToRender = (colors as string[]).map(color => ({ 
        value: color, 
        enabled: true,
        label: color
      }));
    }
  }

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={`rounded-lg bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 ring-0 focus:ring-2 focus:ring-indigo-500 transition-all duration-300 ${
        compact ? 'h-8 px-2 text-xs' : 'px-3 py-2'
      }`}>
        <SelectValue placeholder={compact ? "Todas" : "Todas as cores"} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todas as cores</SelectItem>
        {colorsToRender.map((colorOption) => {
          const color = colorOption.value;
          const enabled = colorOption.enabled;
          const displayLabel = colorOption.label || color;
          const colorInfo = getColorInfo(color);
          
          return (
            <SelectItem 
              key={color} 
              value={color}
              disabled={!enabled}
              className={!enabled ? "opacity-50 cursor-not-allowed text-muted-foreground" : ""}
            >
              <div className="flex items-center gap-3">
                <div 
                  className={`w-4 h-4 rounded-full border border-gray-300 dark:border-gray-600 flex-shrink-0 ${!enabled ? 'opacity-50' : ''}`}
                  style={{ backgroundColor: colorInfo.hex }}
                />
                <span className={`truncate ${!enabled ? 'text-muted-foreground' : ''}`}>
                  {displayLabel}
                </span>
                {!enabled && (
                  <span 
                    className="text-xs text-red-500 ml-2" 
                    title="Esta cor não está disponível para os filtros selecionados"
                  >
                    (indisponível)
                  </span>
                )}
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}