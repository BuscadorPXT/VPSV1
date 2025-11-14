/**
 * Sistema de filtros inteligentes para detecção automática de categoria
 * e filtragem dinâmica de cores baseada na categoria e data selecionada
 */

export interface CategoryMapping {
  keywords: string[];
  category: string;
}

// Mapeamento de palavras-chave para categorias
export const categoryMappings: CategoryMapping[] = [
  {
    keywords: ['iphone', 'iph', 'ip'],
    category: 'IPH'
  },
  {
    keywords: ['macbook', 'mac', 'mcb', 'book'],
    category: 'MCB'
  },
  {
    keywords: ['ipad', 'pad', 'tablet'],
    category: 'IPAD'
  },
  {
    keywords: ['apple watch', 'watch', 'relógio', 'relogio', 'rlg'],
    category: 'RLG'
  },
  {
    keywords: ['airpods', 'pods', 'fone', 'earbuds'],
    category: 'PODS'
  },
  {
    keywords: ['carregador', 'cabo', 'acessório', 'acessorio', 'case', 'capa', 'acss'],
    category: 'ACSS'
  }
];

/**
 * Detecta automaticamente a categoria baseada no texto de busca
 */
export function detectCategoryFromSearch(searchText: string): string | null {
  if (!searchText || searchText.trim().length < 2) {
    return null;
  }

  const normalizedSearch = searchText.toLowerCase().trim();
  
  // Procura por correspondências exatas primeiro
  for (const mapping of categoryMappings) {
    for (const keyword of mapping.keywords) {
      if (normalizedSearch.includes(keyword.toLowerCase())) {
        return mapping.category;
      }
    }
  }

  return null;
}

/**
 * Verifica se uma categoria foi detectada automaticamente
 */
export function shouldAutoUpdateCategory(
  searchText: string, 
  currentCategory: string,
  lastManualCategoryUpdate: number
): boolean {
  // Se a categoria foi alterada manualmente nos últimos 3 segundos, não sobrescrever
  const timeSinceLastManualUpdate = Date.now() - lastManualCategoryUpdate;
  if (timeSinceLastManualUpdate < 3000) {
    return false;
  }

  const detectedCategory = detectCategoryFromSearch(searchText);
  
  // Se não detectou categoria ou a categoria atual já é a detectada
  if (!detectedCategory || currentCategory === detectedCategory) {
    return false;
  }

  return true;
}

/**
 * Gera parâmetros de query para buscar cores filtradas por categoria e data
 */
export function getFilteredColorsQueryParams(
  category: string,
  date: string,
  additionalFilters?: Record<string, string>
): URLSearchParams {
  const params = new URLSearchParams();
  
  if (category && category !== 'all') {
    params.set('category', category);
  }
  
  if (date && date !== 'all') {
    params.set('date', date);
  }

  // Adiciona filtros adicionais se fornecidos
  if (additionalFilters) {
    Object.entries(additionalFilters).forEach(([key, value]) => {
      if (value && value !== 'all') {
        params.set(key, value);
      }
    });
  }

  return params;
}

/**
 * Verifica se os filtros mudaram de forma significativa para requerer uma nova busca de cores
 */
export function shouldRefreshColors(
  previousFilters: { category: string; date: string; search: string },
  currentFilters: { category: string; date: string; search: string }
): boolean {
  return (
    previousFilters.category !== currentFilters.category ||
    previousFilters.date !== currentFilters.date ||
    previousFilters.search !== currentFilters.search
  );
}