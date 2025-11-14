// Catálogo específico de cores por modelo de produto
// Baseado nas especificações oficiais da Apple para cada modelo

export const PRODUCT_MODEL_COLORS = {
  // iPhone 17 Series - cores oficiais da Apple
  "IPHONE 17": ["PRETO", "BRANCO", "LAVANDA", "AZUL NÉVOA", "SÁLVIA"],
  "IPHONE 17 PLUS": ["PRETO", "BRANCO", "LAVANDA", "AZUL NÉVOA", "SÁLVIA"],
  "IPHONE 17 PRO": ["LARANJA CÓSMICO", "AZUL PROFUNDO", "PRATEADO"],
  "IPHONE 17 PRO MAX": ["LARANJA CÓSMICO", "AZUL PROFUNDO", "PRATEADO"],
  "IPHONE AIR": ["AZUL CÉU", "DOURADO CLARO", "BRANCO NUVEM", "PRETO ESPACIAL"],
  
  // iPhone 15 Series - cores oficiais da Apple conforme lançamento
  "IPHONE 15": ["PRETO", "AZUL", "VERDE", "AMARELO", "ROSA"],
  "IPHONE 15 PLUS": ["PRETO", "AZUL", "VERDE", "AMARELO", "ROSA"],
  "IPHONE 15 PRO": ["TITÂNIO PRETO", "TITÂNIO BRANCO", "TITÂNIO AZUL", "TITÂNIO NATURAL"],
  "IPHONE 15 PRO MAX": ["TITÂNIO PRETO", "TITÂNIO BRANCO", "TITÂNIO AZUL", "TITÂNIO NATURAL"],
  
  // iPhone 14 Series
  "IPHONE 14": ["AZUL", "ROXO", "AMARELO", "MEIA-NOITE", "LUZ ESTELAR", "VERMELHO"],
  "IPHONE 14 PLUS": ["AZUL", "ROXO", "AMARELO", "MEIA-NOITE", "LUZ ESTELAR", "VERMELHO"],
  "IPHONE 14 PRO": ["ROXO PROFUNDO", "DOURADO", "PRATEADO", "GRAFITE"],
  "IPHONE 14 PRO MAX": ["ROXO PROFUNDO", "DOURADO", "PRATEADO", "GRAFITE"],
  
  // iPhone 13 Series
  "IPHONE 13": ["ROSA", "AZUL", "MEIA-NOITE", "LUZ ESTELAR", "VERMELHO"],
  "IPHONE 13 MINI": ["ROSA", "AZUL", "MEIA-NOITE", "LUZ ESTELAR", "VERMELHO"],
  "IPHONE 13 PRO": ["AZUL SIERRA", "DOURADO", "PRATEADO", "GRAFITE"],
  "IPHONE 13 PRO MAX": ["AZUL SIERRA", "DOURADO", "PRATEADO", "GRAFITE"],
  
  // iPhone 12 Series
  "IPHONE 12": ["AZUL", "VERDE", "PRETO", "BRANCO", "ROXO", "VERMELHO"],
  "IPHONE 12 MINI": ["AZUL", "VERDE", "PRETO", "BRANCO", "ROXO", "VERMELHO"],
  "IPHONE 12 PRO": ["AZUL PACÍFICO", "DOURADO", "PRATEADO", "GRAFITE"],
  "IPHONE 12 PRO MAX": ["AZUL PACÍFICO", "DOURADO", "PRATEADO", "GRAFITE"],
  
  // iPhone SE
  "IPHONE SE": ["PRETO", "BRANCO", "VERMELHO"],
  
  // iPhone XR
  "IPHONE XR": ["PRETO", "BRANCO", "VERMELHO", "AMARELO", "AZUL", "CORAL"],
  
  // MacBook Air
  "MACBOOK AIR": ["PRATEADO", "CINZA ESPACIAL", "DOURADO"],
  "MACBOOK AIR M1": ["PRATEADO", "CINZA ESPACIAL", "DOURADO"],
  "MACBOOK AIR M2": ["PRATEADO", "CINZA ESPACIAL", "DOURADO", "AZUL MEIA-NOITE"],
  "MACBOOK AIR M3": ["PRATEADO", "CINZA ESPACIAL", "DOURADO", "AZUL MEIA-NOITE"],
  
  // MacBook Pro
  "MACBOOK PRO": ["PRATEADO", "CINZA ESPACIAL"],
  "MACBOOK PRO 13": ["PRATEADO", "CINZA ESPACIAL"],
  "MACBOOK PRO 14": ["PRATEADO", "CINZA ESPACIAL"],
  "MACBOOK PRO 16": ["PRATEADO", "CINZA ESPACIAL"],
  
  // iPad
  "IPAD": ["PRATEADO", "CINZA ESPACIAL"],
  "IPAD AIR": ["AZUL", "ROSA", "ROXO", "LUZ ESTELAR", "CINZA ESPACIAL"],
  "IPAD PRO": ["PRATEADO", "CINZA ESPACIAL"],
  "IPAD MINI": ["ROSA", "LUZ ESTELAR", "ROXO", "CINZA ESPACIAL"],
  
  // Apple Watch
  "APPLE WATCH SERIES 9": ["PRETO", "ROSA", "PRATEADO", "VERMELHO"],
  "APPLE WATCH ULTRA": ["TITANIO NATURAL"],
  "APPLE WATCH SE": ["PRETO", "PRATEADO", "DOURADO"],
  
  // AirPods
  "AIRPODS": ["BRANCO"],
  "AIRPODS PRO": ["BRANCO"],
  "AIRPODS MAX": ["CINZA ESPACIAL", "PRATEADO", "AZUL CÉU", "VERDE", "ROSA"]
} as const;

// Função para detectar o modelo específico a partir do termo de busca
export function detectProductModel(searchTerm: string): string | null {
  const searchUpper = searchTerm.toUpperCase().trim();
  
  // Buscar correspondência exata primeiro
  const exactMatch = Object.keys(PRODUCT_MODEL_COLORS).find(model => 
    searchUpper.includes(model)
  );
  
  if (exactMatch) return exactMatch;
  
  // Buscar correspondências mais flexíveis
  if (searchUpper.includes("IPHONE 17 PRO MAX")) return "IPHONE 17 PRO MAX";
  if (searchUpper.includes("IPHONE 17 PRO")) return "IPHONE 17 PRO";
  if (searchUpper.includes("IPHONE 17 PLUS")) return "IPHONE 17 PLUS";
  if (searchUpper.includes("IPHONE 17")) return "IPHONE 17";
  if (searchUpper.includes("IPHONE AIR")) return "IPHONE AIR";
  
  if (searchUpper.includes("IPHONE 15 PRO MAX")) return "IPHONE 15 PRO MAX";
  if (searchUpper.includes("IPHONE 15 PRO")) return "IPHONE 15 PRO";
  if (searchUpper.includes("IPHONE 15 PLUS")) return "IPHONE 15 PLUS";
  if (searchUpper.includes("IPHONE 15")) return "IPHONE 15";
  
  if (searchUpper.includes("IPHONE 14 PRO MAX")) return "IPHONE 14 PRO MAX";
  if (searchUpper.includes("IPHONE 14 PRO")) return "IPHONE 14 PRO";
  if (searchUpper.includes("IPHONE 14 PLUS")) return "IPHONE 14 PLUS";
  if (searchUpper.includes("IPHONE 14")) return "IPHONE 14";
  
  if (searchUpper.includes("IPHONE 13 PRO MAX")) return "IPHONE 13 PRO MAX";
  if (searchUpper.includes("IPHONE 13 PRO")) return "IPHONE 13 PRO";
  if (searchUpper.includes("IPHONE 13 MINI")) return "IPHONE 13 MINI";
  if (searchUpper.includes("IPHONE 13")) return "IPHONE 13";
  
  if (searchUpper.includes("MACBOOK AIR M3")) return "MACBOOK AIR M3";
  if (searchUpper.includes("MACBOOK AIR M2")) return "MACBOOK AIR M2";
  if (searchUpper.includes("MACBOOK AIR M1")) return "MACBOOK AIR M1";
  if (searchUpper.includes("MACBOOK AIR")) return "MACBOOK AIR";
  
  if (searchUpper.includes("MACBOOK PRO 16")) return "MACBOOK PRO 16";
  if (searchUpper.includes("MACBOOK PRO 14")) return "MACBOOK PRO 14";
  if (searchUpper.includes("MACBOOK PRO 13")) return "MACBOOK PRO 13";
  if (searchUpper.includes("MACBOOK PRO")) return "MACBOOK PRO";
  
  if (searchUpper.includes("IPAD AIR")) return "IPAD AIR";
  if (searchUpper.includes("IPAD PRO")) return "IPAD PRO";
  if (searchUpper.includes("IPAD MINI")) return "IPAD MINI";
  if (searchUpper.includes("IPAD")) return "IPAD";
  
  return null;
}

// Função para obter cores específicas de um modelo
export function getColorsForModel(model: string): string[] {
  const detectedModel = detectProductModel(model);
  if (detectedModel && PRODUCT_MODEL_COLORS[detectedModel as keyof typeof PRODUCT_MODEL_COLORS]) {
    return [...PRODUCT_MODEL_COLORS[detectedModel as keyof typeof PRODUCT_MODEL_COLORS]];
  }
  return [];
}

// Função para verificar se uma cor é válida para um modelo específico
export function isColorValidForModel(color: string, model: string): boolean {
  const modelColors = getColorsForModel(model);
  return modelColors.includes(color.toUpperCase());
}