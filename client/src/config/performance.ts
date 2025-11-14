
export const PERFORMANCE_CONFIG = {
  // Cache times (ultra otimizados para fluidez)
  CACHE_TIMES: {
    PRODUCTS: 10 * 60 * 1000, // 10 minutes - balance perfeito
    STATS: 15 * 60 * 1000, // 15 minutes - reduz chamadas
    USER_PROFILE: 45 * 60 * 1000, // 45 minutes - dados estáveis
    SUPPLIERS: 20 * 60 * 1000, // 20 minutes - otimizado
  },

  // Debounce delays (otimizados para UX)
  DEBOUNCE: {
    SEARCH: 250, // 250ms for search - responsivo
    FILTERS: 150, // 150ms for filters - mais rápido
    TYPING: 150, // 150ms for general typing - fluido
  },

  // Pagination
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 50,
    MAX_PAGE_SIZE: 100,
    MOBILE_PAGE_SIZE: 25,
  },

  // Query limits
  QUERY_LIMITS: {
    PRODUCTS: 1000,
    MAX_PRODUCTS: 2000,
    SEARCH_RESULTS: 500,
  },

  // Retry settings
  RETRY: {
    COUNT: 1,
    DELAY: 1000,
  }
};

export default PERFORMANCE_CONFIG;
