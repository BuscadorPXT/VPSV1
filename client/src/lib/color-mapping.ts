// Color mapping for display with visual color indicators
export const COLOR_MAPPING: Record<string, { hex: string; textColor: string }> = {
  'MIDNIGHT': { hex: '#191970', textColor: '#ffffff' },
  'PINK': { hex: '#FFC0CB', textColor: '#000000' },
  'SILVER': { hex: '#C0C0C0', textColor: '#000000' },
  'GREEN': { hex: '#008000', textColor: '#ffffff' },
  'BLACK': { hex: '#000000', textColor: '#ffffff' },
  'WHITE': { hex: '#FFFFFF', textColor: '#000000' },
  'STARLIGHT': { hex: '#F5F5DC', textColor: '#000000' },
  'DESERT TITANIUM': { hex: '#D2B48C', textColor: '#000000' },
  'NATURAL TITANIUM': { hex: '#E5E4E2', textColor: '#000000' },
  'BLUE': { hex: '#0000FF', textColor: '#ffffff' },
  'PURPLE': { hex: '#800080', textColor: '#ffffff' },
  'TEAL': { hex: '#008080', textColor: '#ffffff' },
  'ULTRAMARINE': { hex: '#3F00FF', textColor: '#ffffff' },
  'RED': { hex: '#FF0000', textColor: '#ffffff' },
  'JET BLACK': { hex: '#0A0A0A', textColor: '#ffffff' },
  'ROSE GOLD': { hex: '#B76E79', textColor: '#ffffff' },
  'GOLD': { hex: '#FFD700', textColor: '#000000' },
  'SPACE GRAY': { hex: '#A9A9A9', textColor: '#000000' },
  'INDIGO': { hex: '#4B0082', textColor: '#ffffff' },
  'ORANGE': { hex: '#FFA500', textColor: '#000000' },
  'YELLOW': { hex: '#FFFF00', textColor: '#000000' },
  // Portuguese colors (cores em português)
  'PRETO': { hex: '#000000', textColor: '#ffffff' },
  'BRANCO': { hex: '#FFFFFF', textColor: '#000000' },
  'AZUL': { hex: '#007AFF', textColor: '#ffffff' },
  'VERDE': { hex: '#34C759', textColor: '#ffffff' },
  'ROXO': { hex: '#AF52DE', textColor: '#ffffff' },
  'ROSA': { hex: '#FF2D92', textColor: '#ffffff' },
  'DOURADO': { hex: '#FFD700', textColor: '#000000' },
  'CINZA': { hex: '#8E8E93', textColor: '#ffffff' },
  'CINZENTO': { hex: '#8E8E93', textColor: '#ffffff' },
  'VERMELHO': { hex: '#FF3B30', textColor: '#ffffff' },
  'AMARELO': { hex: '#FFCC00', textColor: '#000000' },
  'LARANJA': { hex: '#FF9500', textColor: '#000000' },
  
  // Apple specific colors in Portuguese
  'CINZA ESPACIAL': { hex: '#5A5A5C', textColor: '#ffffff' },
  'PRATEADO': { hex: '#E3E3E8', textColor: '#000000' },
  'ROSA DOURADO': { hex: '#E1CCAF', textColor: '#000000' },
  'MEIA-NOITE': { hex: '#2D3748', textColor: '#ffffff' },
  'LUZ ESTELAR': { hex: '#F7F7F7', textColor: '#000000' },
  'ROXO PROFUNDO': { hex: '#5E2CA5', textColor: '#ffffff' },
  'TITÂNIO NATURAL': { hex: '#A8A8A6', textColor: '#000000' },
  'TITÂNIO AZUL': { hex: '#5F6F8A', textColor: '#ffffff' },
  'TITÂNIO BRANCO': { hex: '#F5F5F0', textColor: '#000000' },
  'TITÂNIO PRETO': { hex: '#1C1C1E', textColor: '#ffffff' },
  'TITÂNIO AREIA': { hex: '#D4C5A0', textColor: '#000000' },
  'WHITE TITANIUM': { hex: '#F5F5F0', textColor: '#000000' },
  'BLACK TITANIUM': { hex: '#1C1C1E', textColor: '#ffffff' },
  'AZUL PACÍFICO': { hex: '#1C4E80', textColor: '#ffffff' },
  'AZUL SIERRA': { hex: '#69A7CE', textColor: '#ffffff' },
  'GRAFITE': { hex: '#41424C', textColor: '#ffffff' },
  
  // iPhone 17 Series - novas cores (português)
  'LAVANDA': { hex: '#C8A2C8', textColor: '#000000' },
  'AZUL NÉVOA': { hex: '#A4B8C4', textColor: '#000000' },
  'SÁLVIA': { hex: '#87A96B', textColor: '#ffffff' },
  'LARANJA CÓSMICO': { hex: '#FF6B35', textColor: '#ffffff' },
  'AZUL PROFUNDO': { hex: '#1E3A8A', textColor: '#ffffff' },
  'AZUL CÉU': { hex: '#93C5FD', textColor: '#000000' },
  'DOURADO CLARO': { hex: '#FDE68A', textColor: '#000000' },
  'BRANCO NUVEM': { hex: '#F9FAFB', textColor: '#000000' },
  'PRETO ESPACIAL': { hex: '#111827', textColor: '#ffffff' },
  
  // iPhone 17 Series - English versions
  'LAVENDER': { hex: '#C8A2C8', textColor: '#000000' },
  'MIST BLUE': { hex: '#A4B8C4', textColor: '#000000' },
  'SAGE': { hex: '#87A96B', textColor: '#ffffff' },
  'COSMIC ORANGE': { hex: '#FF6B35', textColor: '#ffffff' },
  'DEEP BLUE': { hex: '#1E3A8A', textColor: '#ffffff' },
  'SKY BLUE': { hex: '#93C5FD', textColor: '#000000' },
  'LIGHT GOLD': { hex: '#FDE68A', textColor: '#000000' },
  'CLOUD WHITE': { hex: '#F9FAFB', textColor: '#000000' },
  'SPACE BLACK': { hex: '#111827', textColor: '#ffffff' },
};

export function getColorInfo(colorName: string): { hex: string; textColor: string } {
  const upperColorName = colorName.toUpperCase().trim();
  
  // Direct match
  if (COLOR_MAPPING[upperColorName]) {
    return COLOR_MAPPING[upperColorName];
  }
  
  // Fallback for unknown colors
  return { hex: '#6B7280', textColor: '#ffffff' }; // Gray fallback
}

export function isColorContrast(backgroundColor: string): boolean {
  // Simple check to determine if we need light or dark text
  const hex = backgroundColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Calculate relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  return luminance > 0.5; // Return true if background is light
}