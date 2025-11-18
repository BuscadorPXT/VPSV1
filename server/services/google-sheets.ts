import { GoogleAuth, OAuth2Client } from 'google-auth-library';
import { google, sheets_v4 } from 'googleapis';

class GoogleSheetsService {
  private authClient: OAuth2Client | null = null;
  private sheets: sheets_v4.Sheets | null = null;
  private spreadsheetId: string;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private dataCache: Map<string, any[]> = new Map();
  private sheetsCache: Map<string, string[]> = new Map();
  private cacheTimestamps: Map<string, number> = new Map();
  private cacheExpiry = 2 * 60 * 60 * 1000; // ⚡ OTIMIZADO: 2 horas (era 15min) - dados mudam 1-2x/dia apenas
  private initialized = false;
  
  // Inflight request tracking to prevent duplicate API calls
  private inflightRequests: Map<string, Promise<any>> = new Map();

  constructor(spreadsheetId?: string) {
    this.spreadsheetId = spreadsheetId || process.env.GOOGLE_SHEET_ID || '1jMXWtn_hcz4tY51-82Z-gwsZQzm0XFJUSf92zdKTdYk';
    this.initializeAuth();
  }

  private async initializeAuth(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      console.log('🚀 Initializing Google Auth...');
      
      // Use service account key file - try multiple possible locations
      const keyFilePath = process.env.GOOGLE_APPLICATION_CREDENTIALS || 
        await (async () => {
          const path = await import('path');
          const fs = await import('fs');
          
          const possiblePaths = [
            path.join(process.cwd(), 'google-service-account.json'),
            path.join(process.cwd(), '../google-service-account.json'),
            './google-service-account.json',
            '../google-service-account.json'
          ];
          
          for (const filePath of possiblePaths) {
            if (fs.existsSync(filePath)) {
              console.log(`✅ Found Google service account at: ${filePath}`);
              return filePath;
            }
          }
          
          console.error('❌ Google service account file not found in any location:', possiblePaths);
          return possiblePaths[0]; // fallback to first option
        })();
      
      const auth = new GoogleAuth({
        keyFile: keyFilePath,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      this.authClient = await auth.getClient();
      this.sheets = google.sheets({ version: 'v4', auth: this.authClient });
      this.initialized = true;
      console.log('✅ Google Auth initialized successfully.');
    } catch (error) {
      console.error('❌ Error initializing Google Auth:', error);
      console.error('❌ Make sure google-service-account.json exists and is valid');
      throw new Error('Failed to initialize Google authentication.');
    }
  }

  // Exponential backoff retry for rate limit errors
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    operation: string = 'API call'
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        
        // Check if it's a rate limit error (429)
        const isRateLimitError = 
          error.message?.includes('Quota exceeded') ||
          error.message?.includes('429') ||
          error.code === 429;
        
        if (isRateLimitError && attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
          console.log(`⏳ Rate limit hit for ${operation}. Waiting ${delay}ms before retry (attempt ${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        // If not a rate limit error or max retries reached, throw
        throw error;
      }
    }
    
    throw lastError;
  }

  private isCacheValid(key: string): boolean {
    const timestamp = this.cacheTimestamps.get(key);
    if (!timestamp) return false;
    
    // Use the consistent cache TTL for all data
    return Date.now() - timestamp < this.cacheExpiry;
  }

  async getSheetData(sheetId: string, range: string): Promise<any[][]> {
    const cacheKey = `${sheetId}:${range}`;

    // Check cache first
    if (this.isCacheValid(cacheKey) && this.dataCache.has(cacheKey)) {
      console.log(`📋 Using cached sheet data for: ${range}`);
      return this.dataCache.get(cacheKey) || [];
    }

    // Check if there's already a request in progress for this data
    if (this.inflightRequests.has(cacheKey)) {
      console.log(`⏳ Request already in progress for: ${range}, reusing existing request`);
      return this.inflightRequests.get(cacheKey)!;
    }

    // Create the request promise with retry logic
    const requestPromise = this.retryWithBackoff(async () => {
      try {
        console.log(`🔄 Fetching data from Google Sheets: ${range}`);
        await this.initializeAuth();

        if (!this.initialized || !this.sheets) {
          throw new Error('Google Sheets service not properly initialized');
        }

        const response = await this.sheets.spreadsheets.values.get({
          spreadsheetId: sheetId,
          range: range,
        });

        const values = response.data.values || [];
        console.log(`📊 Data retrieved: ${values.length} rows from range ${range}`);

        // Cache the result
        this.dataCache.set(cacheKey, values);
        this.cacheTimestamps.set(cacheKey, Date.now());

        return values;
      } finally {
        // Always remove from inflight requests when done
        this.inflightRequests.delete(cacheKey);
      }
    }, 3, `getSheetData(${range})`).catch((error: any) => {
      // Remove from inflight on error too
      this.inflightRequests.delete(cacheKey);
      console.error('Error reading from Google Sheets:', error);
      throw new Error(`Failed to read from Google Sheets: ${error.message}`);
    });

    // Store the promise so concurrent requests can reuse it
    this.inflightRequests.set(cacheKey, requestPromise);

    return requestPromise;
  }

  async getAvailableSheets(sheetId: string) {
    const cacheKey = `sheets:${sheetId}`;

    // Check cache first
    if (this.isCacheValid(cacheKey) && this.sheetsCache.has(cacheKey)) {
      console.log(`📋 Using cached sheet list for: ${sheetId}`);
      return this.sheetsCache.get(cacheKey) || [];
    }

    // Check if there's already a request in progress
    if (this.inflightRequests.has(cacheKey)) {
      console.log(`⏳ Request already in progress for sheet list, reusing existing request`);
      return this.inflightRequests.get(cacheKey)!;
    }

    // Create the request promise with retry logic
    const requestPromise = this.retryWithBackoff(async () => {
      try {
        if (!this.sheets) {
          await this.initializeAuth();
        }

        const response = await this.sheets.spreadsheets.get({
          spreadsheetId: sheetId,
        });

        const sheets = response.data.sheets?.map((sheet: any) => sheet.properties.title) || [];
        console.log(`📊 Available sheets:`, sheets);

        // Cache the result
        this.sheetsCache.set(cacheKey, sheets);
        this.cacheTimestamps.set(cacheKey, Date.now());

        return sheets;
      } finally {
        this.inflightRequests.delete(cacheKey);
      }
    }, 3, 'getAvailableSheets').catch((error: any) => {
      this.inflightRequests.delete(cacheKey);
      console.error('Error getting sheet names:', error);
      throw new Error(`Failed to get sheet names: ${error.message}`);
    });

    this.inflightRequests.set(cacheKey, requestPromise);
    return requestPromise;
  }

  async writeSheetData(sheetId: string, range: string, values: any[][]): Promise<void> {
    await this.initializeAuth();

    if (!this.sheets) {
      throw new Error('Google Sheets service not initialized');
    }

    try {
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range,
        valueInputOption: 'RAW',
        resource: {
          values,
        },
      });

      console.log(`✅ Successfully updated range ${range} in sheet ${sheetId}`);
    } catch (error: any) {
      console.error('Error writing to sheet:', error);
      throw new Error(`Failed to write to sheet: ${error.message}`);
    }
  }

  async moveRowToTop(sheetId: string, sheetName: string, sourceRowIndex: number): Promise<void> {
    await this.initializeAuth();

    if (!this.sheets) {
      throw new Error('Google Sheets service not initialized');
    }

    try {
      // First, get the sheet metadata to find the sheet ID
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: sheetId,
      });

      const sheet = response.data.sheets?.find((s: any) => s.properties.title === sheetName);
      if (!sheet) {
        throw new Error(`Sheet "${sheetName}" not found`);
      }

      const sheetIdNumber = sheet.properties.sheetId;

      // Move row to position 1 (after header)
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        resource: {
          requests: [
            {
              moveDimension: {
                source: {
                  sheetId: sheetIdNumber,
                  dimension: 'ROWS',
                  startIndex: sourceRowIndex,
                  endIndex: sourceRowIndex + 1,
                },
                destinationIndex: 1, // Move to position 1 (after header row)
              },
            },
          ],
        },
      });

      console.log(`✅ Successfully moved row ${sourceRowIndex} to top in sheet ${sheetName}`);
    } catch (error: any) {
      console.error('Error moving row:', error);
      throw new Error(`Failed to move row: ${error.message}`);
    }
  }

  async sortSheetByPrice(sheetId: string, sheetName: string, priceColumnIndex: number): Promise<void> {
    await this.initializeAuth();

    if (!this.sheets) {
      throw new Error('Google Sheets service not initialized');
    }

    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: sheetId,
      });

      const sheet = response.data.sheets?.find((s: any) => s.properties.title === sheetName);
      if (!sheet) {
        throw new Error(`Sheet "${sheetName}" not found`);
      }

      const sheetIdNumber = sheet.properties.sheetId;
      const rowCount = sheet.properties.gridProperties.rowCount;

      // Sort by price column (ascending - lowest prices first)
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        resource: {
          requests: [
            {
              sortRange: {
                range: {
                  sheetId: sheetIdNumber,
                  startRowIndex: 1, // Skip header row
                  endRowIndex: rowCount,
                  startColumnIndex: 0,
                  endColumnIndex: 8, // Assuming 8 columns (A-H)
                },
                sortSpecs: [
                  {
                    dimensionIndex: priceColumnIndex,
                    sortOrder: 'ASCENDING',
                  },
                ],
              },
            },
          ],
        },
      });

      console.log(`✅ Successfully sorted sheet ${sheetName} by price column ${priceColumnIndex}`);
    } catch (error: any) {
      console.error('Error sorting sheet:', error);
      throw new Error(`Failed to sort sheet: ${error.message}`);
    }
  }

  async getRowData(sheetId: string, sheetName: string, rowIndex: number): Promise<any[]> {
    await this.initializeAuth();

    if (!this.sheets) {
      throw new Error('Google Sheets service not initialized');
    }

    try {
      const range = `${sheetName}!A${rowIndex + 1}:H${rowIndex + 1}`;
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range,
      });

      return response.data.values?.[0] || [];
    } catch (error: any) {
      console.error('Error getting row data:', error);
      throw new Error(`Failed to get row data: ${error.message}`);
    }
  }

  // Método público para forçar limpeza do cache
  public clearCache(): void {
    console.log('🧹 Forcing cache cleanup...');
    this.dataCache.clear();
    this.sheetsCache.clear();
    this.cacheTimestamps.clear();
    console.log('✅ All caches cleared');
  }

  // Método para limpeza específica de uma chave de cache
  public clearSpecificCache(cacheKey: string): void {
    console.log(`🎯 Clearing specific cache key: ${cacheKey}`);
    this.dataCache.delete(cacheKey);
    this.cacheTimestamps.delete(cacheKey);
    console.log(`✅ Specific cache cleared: ${cacheKey}`);
  }

  // Método para buscar dados forçando bypass do cache
  async getSheetDataFresh(sheetId: string, range: string) {
    try {
      const cacheKey = `${sheetId}:${range}`;

      // Remover do cache se existir
      this.dataCache.delete(cacheKey);
      this.cacheTimestamps.delete(cacheKey);

      console.log(`🔄 Fetching fresh data (bypassing cache): ${range}`);

      await this.initializeAuth();

      if (!this.initialized || !this.sheets) {
        throw new Error('Google Sheets service not properly initialized');
      }

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: range,
      });

      const values = response.data.values || [];
      console.log(`📊 Fresh data retrieved: ${values.length} rows`);

      // Cache imediatamente os novos dados
      this.dataCache.set(cacheKey, values);
      this.cacheTimestamps.set(cacheKey, Date.now());

      return values;
    } catch (error: any) {
      console.error('Error fetching fresh data from Google Sheets:', error);
      throw new Error(`Failed to fetch fresh data: ${error.message}`);
    }
  }

  // Método para verificar status do cache
  public getCacheStatus(): { dataCache: number; sheetsCache: number; timestamps: number } {
    return {
      dataCache: this.dataCache.size,
      sheetsCache: this.sheetsCache.size,
      timestamps: this.cacheTimestamps.size
    };
  }

  async getSupplierContacts(): Promise<{ [key: string]: { telefone: string; endereco?: string } }> {
    const cacheKey = 'supplier-contacts';

    // Check if we have cached data
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
        console.log('📋 Using cached supplier contacts:', Object.keys(cached.data).length, 'contacts');
        return cached.data;
      }
    }

    try {
      console.log('📋 Fetching supplier contacts from Google Sheets...');
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'FORNECEDORES!A1:C500', // Updated range to include address
      });

      const rows = response.data.values || [];

      if (rows.length === 0) {
        console.warn('⚠️ No supplier contact data found in Google Sheets');
        return {};
      }

      console.log('📋 Processing supplier contacts from', rows.length, 'rows');

      // Skip header row and build contacts object
      const contacts: { [key: string]: { telefone: string; endereco?: string } } = {};
      let processedCount = 0;
      let validCount = 0;

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        processedCount++;

        if (row && row.length >= 2 && row[0] && row[1]) {
          const rawSupplierName = row[0].toString().trim();
          const whatsappNumber = row[1].toString().trim();
          const address = row[2]?.toString().trim() || '';

          if (rawSupplierName && whatsappNumber && whatsappNumber !== 'undefined' && whatsappNumber !== 'null') {
            const supplierName = rawSupplierName.replace(/\s+/g, ' ');
            contacts[supplierName] = {
              telefone: whatsappNumber,
              endereco: address || undefined
            };
            validCount++;

            // Log first few contacts for debugging
            if (validCount <= 5) {
              console.log(`📞 Supplier contact ${validCount}:`, { supplierName, whatsappNumber, address });
            }
          }
        }
      }

      // Cache the result
      this.cache.set(cacheKey, { data: contacts, timestamp: Date.now() });

      console.log('✅ Supplier contacts loaded successfully:', {
        totalRows: rows.length,
        processedRows: processedCount,
        validContacts: validCount,
        finalContactsCount: Object.keys(contacts).length,
        sampleContacts: Object.entries(contacts).slice(0, 3)
      });

      return contacts;

    } catch (error) {
      console.error('❌ Error reading supplier contacts from Google Sheets:', error);
      return {};
    }
  }
}

export const googleSheetsService = new GoogleSheetsService();