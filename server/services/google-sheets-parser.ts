import { googleSheetsService } from './google-sheets';
import { InsertProduct } from '../../shared/schema';

export interface ParsedSheetsData {
  products: InsertProduct[];
  suppliers: string[];
  dates: string[];
  supplierContacts: { [supplierName: string]: { telefone: string; endereco?: string } };
}

// High-level cache for parsed sheet data to prevent reprocessing
const parsedDataCache = new Map<string, { data: ParsedSheetsData; timestamp: number }>();
const PARSED_DATA_TTL = 5 * 60 * 1000; // 5 minutes to match GoogleSheetsService cache

// Inflight parsing requests to prevent duplicate processing
const inflightParsingRequests = new Map<string, Promise<ParsedSheetsData>>();

/**
 * Normalizes supplier names by removing extra spaces
 * Example: "DUBAI SHOP  4017" -> "DUBAI SHOP 4017"
 */
function normalizeSupplierName(name: string): string {
  if (!name) return '';
  return name.trim().replace(/\s+/g, ' ');
}

/**
 * Converts Brazilian currency strings like "R$ 21.700,00" or "R$ 460,50" to numbers
 * Brazilian format: dot for thousands, comma for decimal
 */
function parseCurrency(value: string | number): number {
  if (typeof value === 'number') {
    return value;
  }

  if (!value || typeof value !== 'string') return 0;

  const originalValue = value.toString().trim();

  // Skip empty values
  if (!originalValue || originalValue === '') {
    return 0;
  }

  // Remove currency symbols (R$) and spaces
  let cleanValue = originalValue.replace(/[R$\s]/g, '');

  // Skip if still empty after cleanup
  if (!cleanValue || cleanValue.trim() === '') {
    return 0;
  }

  // Brazilian format parsing: dot for thousands, comma for decimal
  if (cleanValue.includes(',') && cleanValue.includes('.')) {
    // Format: "21.700,00" - dot is thousands separator, comma is decimal
    // Remove all dots (thousands) and replace comma with dot (decimal)
    cleanValue = cleanValue.replace(/\./g, '').replace(',', '.');
  } else if (cleanValue.includes(',') && !cleanValue.includes('.')) {
    // Format: "460,50" - comma is decimal separator
    cleanValue = cleanValue.replace(',', '.');
  } else if (cleanValue.includes('.') && !cleanValue.includes(',')) {
    // Only dot present - check if it's decimal or thousands
    const parts = cleanValue.split('.');
    const lastPart = parts[parts.length - 1];

    // If last part has exactly 2 digits, it's likely decimal
    // If last part has 3 digits, it's likely decimal
    if (parts.length === 2 && lastPart.length === 2) {
      // Format: "460.50" - decimal format (keep as is)
    } else if (lastPart.length === 3) {
      // Format: "21.700" - thousands separator (remove dot)
      cleanValue = cleanValue.replace(/\./g, '');
    } else {
      // Format: "1.234.567" - multiple thousands separators
      cleanValue = cleanValue.replace(/\./g, '');
    }
  }

  const parsed = parseFloat(cleanValue);

  // Validate result
  if (isNaN(parsed)) {
    console.warn(`Failed to parse price: "${originalValue}" -> NaN`);
    return 0;
  }

  // Prevent absurd values
  if (parsed < 0 || parsed > 1000000) {
    console.warn(`Absurd price value detected: ${originalValue} -> ${parsed}, setting to 0`);
    return 0;
  }

  return parsed;
}

async function readSupplierContacts(sheetId: string): Promise<{ [supplierName: string]: { telefone: string; endereco?: string } }> {
  try {
    const range = 'FORNECEDORES!A1:C500'; // Updated range to include address column
    const values = await googleSheetsService.getSheetData(sheetId, range);

    if (!values || values.length === 0) {
      console.log('No data found in FORNECEDORES sheet.');
      return {};
    }

    const supplierContacts: { [supplierName: string]: { telefone: string; endereco?: string } } = {};
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      if (row && row.length >= 2) {
        const rawSupplierName = row[0]?.toString().trim();
        const phoneNumber = row[1]?.toString().trim();
        const address = row[2]?.toString().trim() || '';

        if (rawSupplierName && phoneNumber) {
          const supplierName = normalizeSupplierName(rawSupplierName);
          supplierContacts[supplierName] = {
            telefone: phoneNumber,
            endereco: address || undefined
          };
        }
      }
    }

    console.log('Supplier contacts read successfully:', supplierContacts);
    return supplierContacts;
  } catch (error) {
    console.error('Error reading supplier contacts:', error);
    return {};
  }
}

// Overloaded function signatures for backward compatibility
export async function parseGoogleSheetWithDate(dataReferencia: string): Promise<ParsedSheetsData>;
export async function parseGoogleSheetWithDate(sheetId: string, dataReferencia: string): Promise<ParsedSheetsData>;
export async function parseGoogleSheetWithDate(param1: string, param2?: string): Promise<ParsedSheetsData> {
  // Handle both single-parameter (legacy) and two-parameter (new) calls
  let sheetId: string;
  let dataReferencia: string;

  if (param2 === undefined) {
    // Single parameter call - param1 is dataReferencia, get sheetId from env
    sheetId = process.env.GOOGLE_SHEET_ID || '';
    dataReferencia = param1;
  } else {
    // Two parameter call - param1 is sheetId, param2 is dataReferencia
    sheetId = param1;
    dataReferencia = param2;
  }

  // Check high-level cache first
  const cacheKey = `${sheetId}:${dataReferencia}`;
  const cached = parsedDataCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < PARSED_DATA_TTL) {
    console.log(`📦 Using cached parsed data for: ${dataReferencia} (cache hit, no API calls needed)`);
    return cached.data;
  }

  // Check if parsing is already in progress
  if (inflightParsingRequests.has(cacheKey)) {
    console.log(`⏳ Parsing already in progress for: ${dataReferencia}, waiting for result...`);
    return inflightParsingRequests.get(cacheKey)!;
  }

  // Create parsing promise
  const parsingPromise = (async () => {
    try {
    console.log(`🔍 Looking for sheet: ${dataReferencia}`);
    console.log('📦 ORIGEM DOS DADOS: Planilha Online - Iniciando leitura da fonte de dados');

    if (!sheetId || sheetId === 'undefined') {
      throw new Error('ID da fonte de dados não está configurado corretamente');
    }

    // Get available sheets to verify the sheet exists
    const availableSheets = await googleSheetsService.getAvailableSheets(sheetId);
    console.log(`📊 Available sheets:`, availableSheets);

    let targetSheet = dataReferencia;

    if (dataReferencia === 'all') {
      // When 'all' is requested, use the latest available date
      const datePattern = /^\d{2}-\d{2}$/;
      const availableDateSheets = availableSheets
        .filter(sheet => datePattern.test(sheet))
        .sort((a, b) => {
          const [dayA, monthA] = a.split('-').map(Number);
          const [dayB, monthB] = b.split('-').map(Number);

          if (monthA !== monthB) return monthB - monthA;
          return dayB - dayA;
        });

      if (availableDateSheets.length === 0) {
        throw new Error(`No date sheets found. Available sheets: [${availableSheets.join(', ')}]`);
      }

      targetSheet = availableDateSheets[0];
      console.log(`📅 Using latest available date sheet: ${targetSheet}`);
    } else if (!availableSheets.includes(dataReferencia)) {
      // If exact date not found, try to find the closest available date
      const datePattern = /^\d{2}-\d{2}$/;
      const availableDateSheets = availableSheets
        .filter(sheet => datePattern.test(sheet))
        .sort((a, b) => {
          const [dayA, monthA] = a.split('-').map(Number);
          const [dayB, monthB] = b.split('-').map(Number);

          if (monthA !== monthB) return monthB - monthA;
          return dayB - dayA;
        });

      if (availableDateSheets.length > 0) {
        targetSheet = availableDateSheets[0]; // Use latest available
        console.log(`⚠️ Sheet "${dataReferencia}" not found. Using closest available: ${targetSheet}`);
      } else {
        throw new Error(`Sheet "${dataReferencia}" not found and no date sheets available. Available sheets: [${availableSheets.join(', ')}]`);
      }
    }

    // Determine the sheet to read
    let sheetToRead = '';
    const targetSheetName = targetSheet;

    // Clean the target sheet name (remove any extra quotes)
    const cleanTargetSheet = targetSheetName.replace(/^["']|["']$/g, '');
    console.log(`🔍 Looking for sheet: "${cleanTargetSheet}" (cleaned from: "${targetSheetName}")`);

    // Look for exact sheet name match first
    if (availableSheets.includes(cleanTargetSheet)) {
      sheetToRead = cleanTargetSheet;
      console.log(`✅ Found exact sheet: ${sheetToRead}`);
    } else {
      console.log(`❌ Sheet "${cleanTargetSheet}" not found. Available sheets:`, availableSheets);

      // For date patterns, be more strict - don't fall back to other dates
      if (cleanTargetSheet.match(/^\d{2}-\d{2}$/)) {
        throw new Error(`Sheet "${cleanTargetSheet}" not found. Available date sheets: ${availableSheets.filter(s => s.match(/^\d{2}-\d{2}$/)).join(', ')}`);
      }

      // Only fall back for non-date sheets
      if (availableSheets.length > 0) {
        sheetToRead = availableSheets[0];
        console.log(`⚠️ Using fallback sheet: ${sheetToRead}`);
      }
    }

    // Read data from the specific sheet - no limit to capture ALL products
    const range = `${sheetToRead}!A1:H50000`; // Increased range to read up to 50k rows including WhatsApp column
    console.log(`📊 Reading from Google Sheets: ${sheetId}, range: ${range}`);
    const values = await googleSheetsService.getSheetData(sheetId, range);

    if (!values || values.length === 0) {
      throw new Error(`No data found in sheet "${dataReferencia}"`);
    }

    console.log(`📊 Retrieved ${values.length} rows from Google Sheets`);
    // Assume first row contains headers
    const headers = values[0];
    console.log(`📊 Headers found:`, headers);
    console.log('🔗 Dados retornados do Google Sheets - Processando produtos...');

    const products: InsertProduct[] = [];
    const suppliersSet = new Set<string>();
    const datesSet = new Set<string>();

    // Process each row (skip header)
    for (let i = 1; i < values.length; i++) {
      const row = values[i];

      // Skip empty rows
      if (!row || row.length === 0 || !row[0]) {
        console.log(`⚠️ Pulando linha ${i + 1}: linha vazia ou sem dados na coluna A`);
        continue;
      }

      try {
        // Map based on correct column structure:
        // A=FORNECEDOR, B=CATEGORIA, C=MODELO, D=GB, E= REGIÃO, F=COR, G=PREÇO, H=TIMESTAMP
        const supplier = row[0]?.toString().trim() || '';  // A: FORNECEDOR
        const category = row[1]?.toString().trim() || '';  // B: CATEGORIA
        const model = row[2]?.toString().trim() || '';     // C: MODELO
        const storage = row[3]?.toString().trim() || '';   // D: GB
        const regionIndex = 4;
        const region = (() => {
          const regionValue = row[regionIndex]?.toString().trim();
          return (regionValue && regionValue !== 'Nacional') ? regionValue : null;
        })();    // E: REGIÃO
        const color = row[5]?.toString().trim() || '';     // F: COR
        const priceRaw = row[6] || '';                     // G: PREÇO
        const productTimestamp = row[7]?.toString().trim() || '';  // H: TIMESTAMP

        // Generate SKU from model + storage + color
        const sku = `${model}-${storage}-${color}`.replace(/\s+/g, '-').toUpperCase();

        // Skip if essential fields are missing
        if (!sku || !supplier || !model || !priceRaw) {
          console.warn(`⚠️ Pulando linha ${i + 1}: dados essenciais faltantes`, {
            linha: i + 1,
            sku: !!sku,
            supplier: !!supplier,
            model: !!model,
            priceRaw: !!priceRaw,
            actualValues: { 
              supplier: supplier || 'VAZIO', 
              model: model || 'VAZIO', 
              priceRaw: priceRaw?.toString().substring(0, 20) || 'VAZIO' 
            }
          });
          continue;
        }

        const price = parseCurrency(priceRaw);

        // Debug logging for first few rows
        if (i <= 5) {
          console.log(`Row ${i + 1} debug: priceRaw="${priceRaw}", parsed=${price}, supplier="${supplier}", model="${model}"`);
        }

        if (price <= 0 || isNaN(price)) {
          console.warn(`⚠️ Pulando linha ${i + 1}: preço inválido "${priceRaw}" -> ${price}`, {
            linha: i + 1,
            model: model || 'VAZIO',
            supplier: supplier || 'VAZIO',
            originalPrice: priceRaw,
            parsedPrice: price
          });
          continue;
        }

        const product: any = {
          sku,
          brand: supplier, // Using supplier as brand for now
          model,
          storage,
          color,
          price: price.toString(),
          supplierId: 1, // Will be updated when suppliers are created
          supplierName: supplier, // Include supplier name for frontend compatibility
          productTimestamp: productTimestamp || null, // Timestamp from column H
          available: true,
          isLowestPrice: false, // Will be calculated later
          category: category || null,
          capacity: storage || null,
          region: region || null,
          date: dataReferencia,
          sheetRowId: (i + 1).toString(), // Row number in the sheet (1-based)
          ultimaAtualizacao: new Date()
        };

        // Debug logging for iPhone 16 Pro Max specifically
        if (model?.toLowerCase().includes('iphone 16') && model?.toLowerCase().includes('pro') && model?.toLowerCase().includes('max')) {
          console.log(`📱 iPhone 16 Pro Max found in sheet:`, {
            row: i + 1,
            model,
            supplier,
            price,
            storage,
            color,
            category
          });
        }

        products.push(product);
        suppliersSet.add(supplier);
        datesSet.add(dataReferencia);

      } catch (error) {
        console.warn(`Skipping row ${i + 1} due to error:`, error);
        continue;
      }
    }

    const totalRowsRead = values.length;
    const dataRowsExpected = totalRowsRead - 1; // Menos 1 por causa do header
    const productsProcessed = products.length;
    const skippedRows = dataRowsExpected - productsProcessed;

    console.log(`📊 RESUMO DO PROCESSAMENTO - Data: ${dataReferencia}`);
    console.log(`📋 Total de linhas lidas do Google Sheets: ${totalRowsRead}`);
    console.log(`📋 Linhas de dados esperadas (sem header): ${dataRowsExpected}`);
    console.log(`✅ Produtos processados com sucesso: ${productsProcessed}`);
    console.log(`⚠️ Linhas ignoradas: ${skippedRows}`);

    if (skippedRows > 0) {
      console.warn(`🔍 ${skippedRows} linha(s) foram ignoradas durante o processamento. Verifique os logs acima para detalhes.`);
    }

    // Debug: Check for PHOENIX GABI specifically
    const phoenixProducts = products.filter(product => {
      const supplierName = product.supplierName || product.supplier?.name || product.supplier || '';
      return supplierName.toLowerCase().includes('phoenix') && supplierName.toLowerCase().includes('gabi');
    });
    console.log(`🔍 [PHOENIX GABI PARSER DEBUG] Found ${phoenixProducts.length} PHOENIX GABI products in sheet data`);
    if (phoenixProducts.length > 0) {
      console.log(`🔍 [PHOENIX GABI PARSER DEBUG] Sample products:`, phoenixProducts.slice(0, 3).map(p => ({
        model: p.model,
        supplier: p.supplierName || p.supplier?.name || p.supplier,
        sheet: dataReferencia
      })));
    }

    console.log(`📊 Successfully parsed ${products.length} products and ${suppliersSet.size} suppliers from sheet: ${sheetId} (date: ${dataReferencia})`);

    // Read supplier contacts from FORNECEDORES sheet
    const supplierContacts = await readSupplierContacts(sheetId);

    // Update products with WhatsApp numbers from supplier contacts
    products.forEach(product => {
      const rawSupplierName = product.supplierName || product.brand;
      if (rawSupplierName) {
        const supplierName = normalizeSupplierName(rawSupplierName);
        if (supplierContacts[supplierName]) {
          product.supplierWhatsapp = supplierContacts[supplierName].telefone || null;
        }
      }
    });

    // Calculate lowest prices
    const productsWithLowestPrices = calculateLowestPrices(products);

    const result: ParsedSheetsData = {
      products: productsWithLowestPrices,
      suppliers: Array.from(suppliersSet),
      dates: Array.from(datesSet),
      supplierContacts
    };

    // Cache the parsed result
    parsedDataCache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });
    console.log(`✅ Cached parsed data for: ${dataReferencia}`);

    return result;

  } catch (error: any) {
    console.error(`Error parsing data source for date ${dataReferencia}:`, error);
    throw new Error(`Falha ao processar dados para a data ${dataReferencia}: ${error.message}`);
  } finally {
    // Clean up inflight request
    inflightParsingRequests.delete(cacheKey);
  }
  })();

  // Store the parsing promise
  inflightParsingRequests.set(cacheKey, parsingPromise);
  
  return parsingPromise;
}

export async function parseGoogleSheet(sheetId: string): Promise<ParsedSheetsData> {
  try {
    // Calculate today's tag (DD-MM format)
    const now = new Date();
    const todayTag = [
      String(now.getDate()).padStart(2, '0'),
      String(now.getMonth() + 1).padStart(2, '0')
    ].join('-');

    console.log(`🔍 Looking for sheet: ${todayTag}`);

    // Get available sheets to verify the sheet exists
    const availableSheets = await googleSheetsService.getAvailableSheets(sheetId);

    if (!availableSheets.includes(todayTag)) {
      throw new Error(`Sheet "${todayTag}" not found. Available sheets: [${availableSheets.join(', ')}]`);
    }

    // Read data from the specific sheet - no limit to capture ALL products  
    const range = `${todayTag}!A1:H50000`; // Increased range to read up to 50k rows (no practical limit)
    const values = await googleSheetsService.getSheetData(sheetId, range);

    if (!values || values.length === 0) {
      throw new Error(`No data found in sheet "${todayTag}"`);
    }

    // Assume first row contains headers
    const headers = values[0];
    console.log(`📊 Headers found:`, headers);

    const products: InsertProduct[] = [];
    const suppliersSet = new Set<string>();
    const datesSet = new Set<string>();

    // Process data rows (skip header)
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const rowIndex = i; // Capture the current row index

      if (!row || row.length === 0) continue;

      try {
        // Map the row data based on expected columns
        // Adjust these indices based on your actual column structure
        const supplier = row[0]?.toString().trim() || 'UNKNOWN'; // FORNECEDOR
        const category = row[1]?.toString().trim() || ''; // CATEGORIA
        const model = row[2]?.toString().trim() || ''; // MODELO
        const storage = row[3]?.toString().trim() || ''; // GB
        const regionIndex = 4;
        const region = (() => {
          const regionValue = row[regionIndex]?.toString().trim();
          return (regionValue && regionValue !== 'Nacional') ? regionValue : null;
        })(); // REGIÃO
        const color = row[5]?.toString().trim() || ''; // COR
        const priceStr = row[6]?.toString().trim() || '0'; // PREÇO
        const productTimestamp = row[7]?.toString().trim() || ''; // TIMESTAMP

        const price = parseCurrency(priceStr);

        // Skip rows with missing essential data
        if (!model || !supplier || !price) {
          console.warn(`⚠️ Pulando linha ${rowIndex + 1}: dados essenciais faltantes`, {
            linha: rowIndex + 1,
            model: !!model,
            supplier: !!supplier, 
            price: !!price,
            actualValues: {
              model: model || 'VAZIO',
              supplier: supplier || 'VAZIO',
              price: price || 'VAZIO'
            }
          });
          continue;
        }

        if (price <= 0) {
          console.warn(`⚠️ Pulando linha ${rowIndex + 1}: preço inválido ${price}`);
          continue;
        }

        // Generate SKU
        const sku = `${supplier}-${model}-${storage}-${color}`.replace(/\s+/g, '-').toUpperCase();

        const productData = {
          sku,
          brand: supplier,
          model,
          storage,
          color,
          price: price.toString(),
          supplierId: 1, // Default supplier ID
          supplierName: supplier,
          productTimestamp: productTimestamp || null, // Timestamp from column H
          available: true,
          isLowestPrice: false, // Will be calculated later
          category,
          capacity: storage,
          region,
          date: todayTag,
          sheetRowId: String(rowIndex + 1),
          ultimaAtualizacao: new Date()
        };

        const product: InsertProduct = productData

        products.push(product);
        suppliersSet.add(supplier);
        datesSet.add(todayTag);

      } catch (error) {
        console.warn(`Skipping row ${i + 1} due to error:`, error);
        continue;
      }
    }

    const totalRowsRead = values.length;
    const dataRowsExpected = totalRowsRead - 1; // Menos 1 por causa do header
    const productsProcessed = products.length;
    const skippedRows = dataRowsExpected - productsProcessed;

    console.log(`📊 RESUMO DO PROCESSAMENTO - Data: ${todayTag}`);
    console.log(`📋 Total de linhas lidas do Google Sheets: ${totalRowsRead}`);
    console.log(`📋 Linhas de dados esperadas (sem header): ${dataRowsExpected}`);
    console.log(`✅ Produtos processados com sucesso: ${productsProcessed}`);
    console.log(`⚠️ Linhas ignoradas: ${skippedRows}`);

    if (skippedRows > 0) {
      console.warn(`🔍 ${skippedRows} linha(s) foram ignoradas durante o processamento. Verifique os logs acima para detalhes.`);
    }

    // Read supplier contacts from FORNECEDORES sheet
    const supplierContacts = await readSupplierContacts(sheetId);

    // Update products with WhatsApp numbers from supplier contacts
    products.forEach(product => {
      const rawSupplierName = product.supplierName || product.brand;
      if (rawSupplierName) {
        const supplierName = normalizeSupplierName(rawSupplierName);
        if (supplierContacts[supplierName]) {
          product.supplierWhatsapp = supplierContacts[supplierName].telefone || null;
        }
      }
    });

    // Calculate lowest prices
    const productsWithLowestPrices = calculateLowestPrices(products);

    return {
      products: productsWithLowestPrices,
      suppliers: Array.from(suppliersSet),
      dates: Array.from(datesSet),
      supplierContacts
    };

  } catch (error: any) {
    console.error('Error parsing data source:', error);
    throw new Error(`Falha ao processar fonte de dados: ${error.message}`);
  }
}

export function calculateLowestPrices(products: InsertProduct[]): InsertProduct[] {
  // Group products by model+storage+color to find lowest prices
  const productGroups = new Map<string, InsertProduct[]>();

  products.forEach(product => {
    const key = `${product.model}-${product.storage}-${product.color}`.toLowerCase();
    if (!productGroups.has(key)) {
      productGroups.set(key, []);
    }
    productGroups.get(key)!.push(product);
  });

  // Mark lowest price products
  const result: InsertProduct[] = [];

  productGroups.forEach(group => {
    if (group.length === 0) return;

    // Find the lowest price in this group
    const lowestPrice = Math.min(...group.map(p => parseFloat(p.price)));

    group.forEach(product => {
      const productPrice = parseFloat(product.price);
      result.push({
        ...product,
        isLowestPrice: Math.abs(productPrice - lowestPrice) < 0.01 // Account for floating point precision
      });
    });
  });

  const lowestPriceCount = result.filter(p => p.isLowestPrice).length;
  console.log(`🏷️ Found ${lowestPriceCount} products with lowest prices out of ${result.length} total`);

  return result;
}
// This code updates the Google Sheets parser to include supplier ratings by fetching them from the database and incorporating them into the product data.