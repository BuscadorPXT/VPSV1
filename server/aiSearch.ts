import OpenAI from "openai";
import { IStorage } from "./storage";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface SearchFilters {
  model?: string;
  storage?: string;
  color?: string;
  category?: string;
  capacity?: string;
  region?: string;
}

export interface ProductSearchResult {
  productName: string;
  bestPrice: number;
  supplierName: string;
  lastUpdated: string;
  aiTips: string[];
  productDetails: {
    model: string;
    storage: string;
    color: string;
    category: string;
    capacity: string;
    region: string;
  };
}

export async function extractSearchFilters(query: string): Promise<SearchFilters> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Você é um especialista em produtos Apple. Analise a consulta do usuário e extraia os filtros de busca.
          
          Retorne um JSON com os seguintes campos (apenas se mencionados na consulta):
          - model: modelo do produto (ex: "iPhone 13", "iPad Pro", "MacBook Air")
          - storage: capacidade de armazenamento (ex: "128GB", "256GB", "512GB", "1TB")
          - color: cor do produto (ex: "preto", "branco", "azul", "rosa", "vermelho")
          - category: categoria (ex: "iPhone", "iPad", "MacBook", "Apple Watch")
          - capacity: capacidade da bateria ou similar (se aplicável)
          - region: região ou operadora (se mencionada)
          
          Se um campo não for mencionado explicitamente, não o inclua no JSON.
          Normalize os valores para português brasileiro padrão.`
        },
        {
          role: "user",
          content: query
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result as SearchFilters;
  } catch (error) {
    console.error("Erro ao extrair filtros:", error);
    return {};
  }
}

// Normalize text for better matching
function normalizeText(text: string): string {
  return text.toLowerCase()
    .replace(/\s+/g, '') // Remove spaces
    .replace(/[^\w]/g, '') // Remove special characters
    .replace(/se2/g, 'se2')
    .replace(/se\s*2/g, 'se2');
}

export async function findBestProductMatch(
  filters: SearchFilters
): Promise<ProductSearchResult | null> {
  try {
    // Import Google Sheets parser
    const { parseGoogleSheetWithDate } = await import('./services/google-sheets-parser');
    
    // Get current date for search
    const currentDate = new Date();
    const todayTag = [
      String(currentDate.getDate()).padStart(2,'0'),
      String(currentDate.getMonth()+1).padStart(2,'0')
    ].join('-');
    
    const SHEET_ID = process.env.GOOGLE_SHEET_ID;
    if (!SHEET_ID) {
      throw new Error('Google Sheet ID não configurado');
    }

    // Fetch data directly from Google Sheets
    const sheetsData = await parseGoogleSheetWithDate(SHEET_ID, todayTag);
    
    // Log sample of available products
    console.log("📦 Total de produtos disponíveis:", sheetsData.products.length);
    
    // Show a variety of available products for debugging
    const sampleProducts = sheetsData.products.slice(0, 10).map(p => ({
      model: p.model,
      storage: p.storage,
      color: p.color,
      category: p.category
    }));
    console.log("📋 Amostra de produtos disponíveis:", sampleProducts);
    
    // Check if there are any iPhone products
    const iphoneProducts = sheetsData.products.filter(p => 
      p.model && p.model.toLowerCase().includes('iphone')
    );
    console.log("📱 Produtos iPhone encontrados:", iphoneProducts.length);
    
    if (iphoneProducts.length > 0) {
      console.log("📱 Exemplo de iPhone:", {
        model: iphoneProducts[0].model,
        storage: iphoneProducts[0].storage,
        color: iphoneProducts[0].color,
        category: iphoneProducts[0].category
      });
    }

    // Create color translation map
    const colorMap: { [key: string]: string[] } = {
      'preto': ['black', 'preto', 'space gray', 'space grey'],
      'branco': ['white', 'branco', 'silver'],
      'azul': ['blue', 'azul', 'pacific blue', 'sierra blue'],
      'rosa': ['pink', 'rosa', 'rose gold'],
      'verde': ['green', 'verde', 'alpine green', 'midnight green'],
      'vermelho': ['red', 'vermelho', 'product red'],
      'dourado': ['gold', 'dourado', 'champagne'],
      'roxo': ['purple', 'roxo', 'deep purple']
    };



    // Filter products based on AI extracted filters with partial matching
    let filteredProducts = sheetsData.products.filter((product: any) => {
      let matches = true;
      
      // Model matching - partial matching for better search results
      if (filters.model) {
        const modelQuery = normalizeText(filters.model);
        const productModel = normalizeText(product.model);
        
        // Partial match using includes - more flexible search
        if (!productModel.includes(modelQuery)) {
          matches = false;
        }
      }
      
      // Storage matching - exact match
      if (filters.storage && matches) {
        const storageQuery = normalizeText(filters.storage);
        const productStorage = normalizeText(product.storage);
        
        if (productStorage !== storageQuery) {
          matches = false;
        }
      }
      
      // Color matching - exact match
      if (filters.color && matches) {
        const colorQuery = normalizeText(filters.color);
        const productColor = normalizeText(product.color);
        
        if (productColor !== colorQuery) {
          matches = false;
        }
      }
      
      // Category matching - exact match
      if (filters.category && matches) {
        const categoryQuery = normalizeText(filters.category);
        const productCategory = normalizeText(product.category);
        
        if (productCategory !== categoryQuery) {
          matches = false;
        }
      }
      
      // Capacity matching - exact match
      if (filters.capacity && matches) {
        const capacityQuery = normalizeText(filters.capacity);
        const productCapacity = normalizeText(product.capacity);
        
        if (productCapacity !== capacityQuery) {
          matches = false;
        }
      }
      
      // Region matching - exact match
      if (filters.region && matches) {
        const regionQuery = normalizeText(filters.region);
        const productRegion = normalizeText(product.region);
        
        if (productRegion !== regionQuery) {
          matches = false;
        }
      }
      
      return matches;
    });

    console.log("🔍 Produtos após filtragem:", filteredProducts.length);
    
    // If no exact matches found, return null (no flexible matching)
    if (filteredProducts.length === 0) {
      console.log("❌ Nenhum produto encontrado com os filtros exatos:", filters);
      return null;
    }

    // Encontrar o produto com melhor preço
    const bestProduct = filteredProducts.reduce((best: any, current: any) => {
      const bestPrice = parseFloat(best.price.replace(/[^\d,]/g, '').replace(',', '.'));
      const currentPrice = parseFloat(current.price.replace(/[^\d,]/g, '').replace(',', '.'));
      return currentPrice < bestPrice ? current : best;
    });

    // Calcular tempo desde última atualização usando a data real
    const currentTime = new Date();
    const lastUpdated = `Atualizado hoje às ${currentTime.getHours().toString().padStart(2, '0')}:${currentTime.getMinutes().toString().padStart(2, '0')}`;

    // Gerar dicas da IA
    const aiTips = await generateAITips(bestProduct, filteredProducts);

    const cleanPrice = parseFloat(bestProduct.price.replace(/[^\d,]/g, '').replace(',', '.'));

    return {
      productName: `${bestProduct.model} ${bestProduct.storage} ${bestProduct.color}`,
      bestPrice: cleanPrice,
      supplierName: bestProduct.brand,
      lastUpdated,
      aiTips,
      productDetails: {
        model: bestProduct.model,
        storage: bestProduct.storage,
        color: bestProduct.color,
        category: bestProduct.category || "",
        capacity: bestProduct.capacity || "",
        region: bestProduct.region || ""
      }
    };
  } catch (error) {
    console.error("Erro ao buscar melhor produto:", error);
    return null;
  }
}

function calculateTimeAgo(date: Date): string {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInDays > 0) {
    return `há ${diffInDays} dia${diffInDays > 1 ? 's' : ''}`;
  } else if (diffInHours > 0) {
    return `há ${diffInHours} hora${diffInHours > 1 ? 's' : ''}`;
  } else {
    return 'há menos de 1 hora';
  }
}

async function generateAITips(bestProduct: any, allProducts: any[]): Promise<string[]> {
  try {
    // Analisar preços e fornecedores
    const priceAnalysis = analyzePrices(bestProduct, allProducts);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Você é um consultor especialista em compras de produtos Apple. 
          Analise os dados fornecidos e gere 2-3 dicas práticas e úteis para o usuário.
          
          Foque em:
          - Timing de compra (se deve esperar ou comprar agora)
          - Comparação de preços entre fornecedores
          - Sugestões sobre variações do produto
          - Alertas sobre tendências de preço
          
          Retorne um JSON com array "tips" contendo strings curtas e diretas.`
        },
        {
          role: "user",
          content: JSON.stringify({
            produto: `${bestProduct.model} ${bestProduct.storage} ${bestProduct.color}`,
            melhorPreco: bestProduct.price,
            fornecedor: bestProduct.brand || bestProduct.supplier?.name || "Não informado",
            ultimaAtualizacao: bestProduct.updatedAt,
            analisePrecos: priceAnalysis
          })
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || '{"tips":[]}');
    return result.tips || [];
  } catch (error) {
    console.error("Erro ao gerar dicas:", error);
    return [
      "Verifique novamente em algumas horas para atualizações de preço",
      "Compare com outros fornecedores antes de finalizar a compra"
    ];
  }
}

function analyzePrices(bestProduct: any, allProducts: any[]) {
  const prices = allProducts.map(p => p.price).sort((a, b) => a - b);
  const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
  const pricePosition = prices.indexOf(bestProduct.price) + 1;
  
  return {
    posicaoPreco: `${pricePosition}º melhor de ${prices.length}`,
    diferenceaMedia: ((bestProduct.price - avgPrice) / avgPrice * 100).toFixed(1) + '%',
    variacaoPrecos: {
      menor: Math.min(...prices),
      maior: Math.max(...prices),
      media: Math.round(avgPrice)
    }
  };
}

export async function processAISearch(query: string): Promise<ProductSearchResult | null> {
  try {
    console.log("🤖 AI Search query:", query);
    
    // Extrair filtros da consulta
    const filters = await extractSearchFilters(query);
    console.log("🔍 Filtros extraídos pela IA:", JSON.stringify(filters, null, 2));
    
    // Buscar melhor produto correspondente
    const result = await findBestProductMatch(filters);
    
    if (!result) {
      console.log("❌ Nenhum produto encontrado com os filtros:", filters);
    } else {
      console.log("✅ Produto encontrado:", result.productName);
    }
    
    return result;
  } catch (error) {
    console.error("Erro no processamento da busca com IA:", error);
    return null;
  }
}