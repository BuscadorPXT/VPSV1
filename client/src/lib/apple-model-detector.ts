import appleColorsData from '../../../src/data/apple-colors.json';

export interface ModelColorInfo {
  model: string;
  colors: string[];
  officialColors: string[];
}

/**
 * Normaliza termos de pesquisa para detectar modelos Apple
 */
export function normalizeSearchTerm(searchTerm: string): string {
  if (!searchTerm) return '';
  
  return searchTerm
    .toLowerCase()
    .trim()
    // Remove caracteres especiais e múltiplos espaços
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    // Normaliza termos comuns
    .replace(/\biphone\b/g, 'iphone')
    .replace(/\bmacbook\b/g, 'macbook')
    .replace(/\bpro max\b/g, 'pro max')
    .replace(/\bair\b/g, 'air')
    .replace(/\bpro\b/g, 'pro')
    .replace(/\bmini\b/g, 'mini')
    .replace(/\bplus\b/g, 'plus');
}

/**
 * Detecta modelo Apple específico baseado no termo de pesquisa
 */
export function detectAppleModel(searchTerm: string): ModelColorInfo | null {
  const normalized = normalizeSearchTerm(searchTerm);
  
  if (!normalized) return null;

  // Busca em iPhones
  const iphones = appleColorsData.iphones as Record<string, { colors: string[]; officialColors: string[] }>;
  for (const [modelName, modelData] of Object.entries(iphones)) {
    const normalizedModelName = normalizeSearchTerm(modelName);
    
    // Verifica correspondência exata ou parcial
    if (normalized.includes(normalizedModelName) || normalizedModelName.includes(normalized)) {
      // Verifica se é uma correspondência mais específica
      const modelParts = normalizedModelName.split(' ');
      const searchParts = normalized.split(' ');
      
      let matchScore = 0;
      for (const part of searchParts) {
        if (modelParts.includes(part)) {
          matchScore++;
        }
      }
      
      // Requer pelo menos 2 partes correspondentes para iPhones
      if (matchScore >= 2) {
        return {
          model: modelName,
          colors: modelData.colors,
          officialColors: modelData.officialColors
        };
      }
    }
  }

  // Busca em MacBooks
  const macbooks = appleColorsData.macbooks as Record<string, { colors: string[]; officialColors: string[] }>;
  for (const [modelName, modelData] of Object.entries(macbooks)) {
    const normalizedModelName = normalizeSearchTerm(modelName);
    
    if (normalized.includes(normalizedModelName) || normalizedModelName.includes(normalized)) {
      const modelParts = normalizedModelName.split(' ');
      const searchParts = normalized.split(' ');
      
      let matchScore = 0;
      for (const part of searchParts) {
        if (modelParts.includes(part)) {
          matchScore++;
        }
      }
      
      // Requer pelo menos 2 partes correspondentes para MacBooks
      if (matchScore >= 2) {
        return {
          model: modelName,
          colors: modelData.colors,
          officialColors: modelData.officialColors
        };
      }
    }
  }

  return null;
}

/**
 * Verifica se uma cor está disponível para um modelo específico
 */
export function isColorAvailableForModel(color: string, modelInfo: ModelColorInfo): boolean {
  const normalizedColor = color.toLowerCase().trim();
  
  return modelInfo.colors.some(modelColor => 
    modelColor.toLowerCase().trim() === normalizedColor
  ) || modelInfo.officialColors.some(officialColor => 
    officialColor.toLowerCase().trim() === normalizedColor
  );
}

/**
 * Obtém todas as cores disponíveis para um modelo, incluindo variações
 */
export function getAllColorsForModel(modelInfo: ModelColorInfo): string[] {
  const allColors = new Set<string>();
  
  // Adiciona cores em português
  modelInfo.colors.forEach(color => allColors.add(color));
  
  // Adiciona cores oficiais em inglês
  modelInfo.officialColors.forEach(color => allColors.add(color));
  
  return Array.from(allColors).sort();
}

/**
 * Mapeia cor do banco de dados para cor oficial do modelo
 */
export function mapDatabaseColorToModel(databaseColor: string, modelInfo: ModelColorInfo): string | null {
  const normalizedDbColor = databaseColor.toLowerCase().trim();
  
  // Busca correspondência exata nas cores do modelo
  for (let i = 0; i < modelInfo.colors.length; i++) {
    if (modelInfo.colors[i].toLowerCase().trim() === normalizedDbColor) {
      return modelInfo.colors[i];
    }
  }
  
  // Busca correspondência exata nas cores oficiais
  for (let i = 0; i < modelInfo.officialColors.length; i++) {
    if (modelInfo.officialColors[i].toLowerCase().trim() === normalizedDbColor) {
      return modelInfo.officialColors[i];
    }
  }
  
  // Busca correspondência parcial (para casos como "preto" vs "black")
  const colorMappings: Record<string, string[]> = {
    'preto': ['black', 'space black', 'grafite', 'space gray'],
    'branco': ['white', 'silver', 'prateado', 'estelar', 'starlight'],
    'azul': ['blue', 'pacific blue', 'sierra blue', 'midnight blue'],
    'verde': ['green', 'midnight green', 'alpine green'],
    'dourado': ['gold'],
    'vermelho': ['red'],
    'rosa': ['pink'],
    'violeta': ['purple', 'deep purple'],
    'amarelo': ['yellow'],
    'grafite': ['graphite', 'space gray', 'space black'],
    'titânio': ['titanium', 'natural titanium', 'blue titanium', 'white titanium', 'black titanium']
  };
  
  for (const [ptColor, variations] of Object.entries(colorMappings)) {
    if (normalizedDbColor.includes(ptColor)) {
      // Encontra a primeira cor do modelo que corresponde a esta variação
      for (const modelColor of modelInfo.colors) {
        const normalizedModelColor = modelColor.toLowerCase();
        if (variations.some(variation => normalizedModelColor.includes(variation))) {
          return modelColor;
        }
      }
    }
  }
  
  return null;
}