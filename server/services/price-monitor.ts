import { googleSheetsService } from './google-sheets.js';
import { db } from '../db.js';
import { products, priceChangeEvents } from '../../shared/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import WebSocket from 'ws';

export interface PriceChangeEvent {
  productId: string;
  model: string;
  oldPrice: number;
  newPrice: number;
  priceDrop: number;
  supplier: string;
  sheetName: string;
  rowIndex: number;
  timestamp: Date;
}

export interface WebSocketMessage {
  type: 'price_update' | 'row_moved' | 'sheet_sorted';
  data: any;
  timestamp: Date;
}

class PriceMonitorService {
  private wss: WebSocket.Server | null = null;
  private readonly SHEET_ID = process.env.GOOGLE_SHEETS_ID || '';
  private readonly PRICE_COLUMN_INDEX = 6; // Column G (0-indexed)

  setWebSocketServer(wss: WebSocket.Server) {
    this.wss = wss;
  }

  private broadcastToClients(message: WebSocketMessage) {
    if (!this.wss) return;

    const messageStr = JSON.stringify(message);
    console.log(`📡 Broadcasting to ${this.wss.clients.size} connected clients:`, message.type);
    
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
        console.log(`✅ Message sent to client`);
      }
    });
  }

  async handlePriceChange(
    sheetName: string,
    rowIndex: number,
    oldValue: string,
    newValue: string
  ): Promise<void> {
    try {
      console.log(`📊 Processing price change in ${sheetName}, row ${rowIndex}`);
      console.log(`📊 Price change: ${oldValue} → ${newValue}`);

      // Parse price values
      const oldPrice = this.parsePrice(oldValue);
      const newPrice = this.parsePrice(newValue);

      if (oldPrice <= 0 || newPrice <= 0) {
        console.log('⚠️ Invalid price values, skipping');
        return;
      }

      // Check if price dropped
      const priceDrop = oldPrice - newPrice;
      if (priceDrop <= 0) {
        console.log('⚠️ Price did not drop, no action needed');
        return;
      }

      console.log(`💰 Price drop detected: $${priceDrop.toFixed(2)} (${((priceDrop / oldPrice) * 100).toFixed(1)}%)`);

      // Get row data to identify the product
      const rowData = await googleSheetsService.getRowData(this.SHEET_ID, sheetName, rowIndex);
      
      if (!rowData || rowData.length < 7) {
        console.log('⚠️ Insufficient row data, skipping');
        return;
      }

      const [supplier, category, model, storage, region, color, price] = rowData;

      // Check if this is an iPhone product
      const isIPhone = this.isIPhoneProduct(model, category);
      
      if (!isIPhone) {
        console.log('⚠️ Not an iPhone product, skipping row movement');
        return;
      }

      console.log(`📱 iPhone price drop detected: ${model} - ${supplier}`);

      // Create price change event
      const priceEvent: PriceChangeEvent = {
        productId: `${sheetName}-${rowIndex}`,
        model: model || 'Unknown',
        oldPrice,
        newPrice,
        priceDrop,
        supplier: supplier || 'Unknown',
        sheetName,
        rowIndex,
        timestamp: new Date()
      };

      const dropPercentage = (priceDrop / oldPrice) * 100;

      // Log price change event to database
      const priceChangeLog = await db.insert(priceChangeEvents).values({
        productId: priceEvent.productId,
        sheetName,
        rowIndex,
        model: priceEvent.model,
        supplier: priceEvent.supplier,
        oldPrice: oldPrice.toString(),
        newPrice: newPrice.toString(),
        priceDrop: priceDrop.toString(),
        dropPercentage: dropPercentage.toString(),
        processingStatus: 'pending'
      }).returning();

      try {
        // Move row to top of sheet (after header)
        await this.moveProductToTop(sheetName, rowIndex, priceEvent);

        // Update processing status to processed
        await db
          .update(priceChangeEvents)
          .set({ 
            processingStatus: 'processed',
            wasMovedToTop: true,
            wasSheetSorted: true
          })
          .where(eq(priceChangeEvents.id, priceChangeLog[0].id));

        // Get updated product data after reordering
        const updatedSheetData = await this.getUpdatedProductOrder(sheetName);
        
        // Broadcast comprehensive update to connected clients
        this.broadcastToClients({
          type: 'price_drop',
          data: {
            produto: {
              id: priceEvent.productId,
              nome: priceEvent.model,
              preco: newPrice,
              supplier: priceEvent.supplier,
              oldPrice: oldPrice,
              priceDrop: priceDrop,
              dropPercentage: dropPercentage
            },
            novaOrdem: updatedSheetData.productIds,
            sheetName: sheetName,
            totalProducts: updatedSheetData.totalProducts,
            timestamp: new Date()
          },
          timestamp: new Date()
        });

        // Update product in database if it exists
        await this.updateProductInDatabase(sheetName, rowIndex, newPrice);

      } catch (error) {
        console.error('❌ Error processing price change:', error);
        
        // Update processing status to failed
        await db
          .update(priceChangeEvents)
          .set({ 
            processingStatus: 'failed',
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
          })
          .where(eq(priceChangeEvents.id, priceChangeLog[0].id));
        
        throw error;
      }

    } catch (error) {
      console.error('❌ Error handling price change:', error);
    }
  }

  private async moveProductToTop(
    sheetName: string,
    sourceRowIndex: number,
    priceEvent: PriceChangeEvent
  ): Promise<void> {
    try {
      console.log(`🔄 Moving row ${sourceRowIndex} to top in sheet ${sheetName}`);

      // Move the row to position 1 (after header)
      await googleSheetsService.moveRowToTop(this.SHEET_ID, sheetName, sourceRowIndex);

      console.log(`✅ Successfully moved iPhone product to top: ${priceEvent.model}`);

      // Broadcast row movement to clients
      this.broadcastToClients({
        type: 'row_moved',
        data: {
          sheetName,
          sourceRowIndex,
          destinationIndex: 1,
          product: priceEvent
        },
        timestamp: new Date()
      });

      // Optional: Sort entire sheet by price to maintain consistency
      await this.sortSheetByPrice(sheetName);

    } catch (error) {
      console.error('❌ Error moving product to top:', error);
      throw error;
    }
  }

  private async sortSheetByPrice(sheetName: string): Promise<void> {
    try {
      console.log(`📊 Sorting sheet ${sheetName} by price`);

      await googleSheetsService.sortSheetByPrice(this.SHEET_ID, sheetName, this.PRICE_COLUMN_INDEX);

      console.log(`✅ Successfully sorted sheet ${sheetName} by price`);

      // Broadcast sort completion to clients
      this.broadcastToClients({
        type: 'sheet_sorted',
        data: {
          sheetName,
          sortedBy: 'price',
          timestamp: new Date()
        },
        timestamp: new Date()
      });

    } catch (error) {
      console.error('❌ Error sorting sheet by price:', error);
      // Don't throw error here as row movement is more important
    }
  }

  private async updateProductInDatabase(
    sheetName: string,
    rowIndex: number,
    newPrice: number
  ): Promise<void> {
    try {
      const updateResult = await db
        .update(products)
        .set({ 
          price: newPrice.toString(),
          ultimaAtualizacao: new Date()
        })
        .where(
          and(
            eq(products.date, sheetName),
            sql`${products.sheetRowId} = ${rowIndex.toString()}`
          )
        );

      console.log(`📊 Updated product in database: ${sheetName}-${rowIndex}`);
    } catch (error) {
      console.error('❌ Error updating product in database:', error);
      // Don't throw error here as sheet operations are more important
    }
  }

  private isIPhoneProduct(model: string, category: string): boolean {
    if (!model && !category) return false;
    
    const modelStr = (model || '').toLowerCase();
    const categoryStr = (category || '').toLowerCase();
    
    // Check for iPhone indicators
    const iphoneIndicators = [
      'iphone',
      'iph',
      'ip'
    ];

    return iphoneIndicators.some(indicator => 
      modelStr.includes(indicator) || categoryStr.includes(indicator)
    );
  }

  private parsePrice(priceStr: string): number {
    if (!priceStr) return 0;
    
    // Remove currency symbols and spaces
    const cleanPrice = priceStr.toString()
      .replace(/[R$\s,]/g, '')
      .replace(/\./g, '');
    
    const price = parseFloat(cleanPrice);
    return isNaN(price) ? 0 : price / 100; // Convert from cents to dollars
  }

  // Method to manually trigger iPhone reordering (for testing)
  async manualIPhoneReorder(sheetName: string): Promise<void> {
    try {
      console.log(`🔧 Manual iPhone reorder triggered for sheet: ${sheetName}`);
      
      // Get all data from the sheet
      const allData = await googleSheetsService.getSheetData(this.SHEET_ID, `${sheetName}!A:H`);
      
      if (!allData || allData.length < 2) {
        console.log('⚠️ No data found in sheet');
        return;
      }

      const headers = allData[0];
      const dataRows = allData.slice(1);

      // Find iPhone products and sort by price
      const iphoneRows = dataRows
        .map((row, index) => ({ row, originalIndex: index + 1 }))
        .filter(({ row }) => this.isIPhoneProduct(row[2], row[1])) // model, category
        .sort((a, b) => {
          const priceA = this.parsePrice(a.row[6]);
          const priceB = this.parsePrice(b.row[6]);
          return priceA - priceB; // Ascending order (lowest first)
        });

      if (iphoneRows.length === 0) {
        console.log('📱 No iPhone products found in sheet');
        return;
      }

      console.log(`📱 Found ${iphoneRows.length} iPhone products, reordering...`);

      // Sort the entire sheet by price
      await this.sortSheetByPrice(sheetName);

      console.log(`✅ Manual iPhone reorder completed for sheet: ${sheetName}`);

    } catch (error) {
      console.error('❌ Error in manual iPhone reorder:', error);
      throw error;
    }
  }

  private async getUpdatedProductOrder(sheetName: string): Promise<{ productIds: string[], totalProducts: number }> {
    try {
      // Get all data from the sheet after reordering
      const allData = await googleSheetsService.getSheetData(this.SHEET_ID, `${sheetName}!A:H`);
      
      if (!allData || allData.length < 2) {
        return { productIds: [], totalProducts: 0 };
      }

      const dataRows = allData.slice(1); // Skip header
      const productIds = dataRows.map((row, index) => `${sheetName}-${index + 1}`);
      
      console.log(`📊 Updated product order for ${sheetName}: ${productIds.length} products`);
      
      return {
        productIds,
        totalProducts: dataRows.length
      };
    } catch (error) {
      console.error('❌ Error getting updated product order:', error);
      return { productIds: [], totalProducts: 0 };
    }
  }

  // Get price monitoring statistics
  async getPriceMonitoringStats(): Promise<any> {
    try {
      // Get recent price changes from database
      const recentUpdates = await db
        .select()
        .from(products)
        .where(sql`${products.ultimaAtualizacao} >= NOW() - INTERVAL '1 hour'`)
        .orderBy(sql`${products.ultimaAtualizacao} DESC`)
        .limit(20);

      // Count iPhone products
      const iphoneCount = await db
        .select({ count: sql`count(*)` })
        .from(products)
        .where(sql`${products.model} ILIKE '%iphone%' OR ${products.category} ILIKE '%iph%'`);

      return {
        recentUpdates: recentUpdates.length,
        iphoneProductsCount: iphoneCount[0]?.count || 0,
        lastUpdate: recentUpdates[0]?.ultimaAtualizacao || null,
        websocketConnections: this.wss?.clients.size || 0
      };
    } catch (error) {
      console.error('❌ Error getting monitoring stats:', error);
      return {
        recentUpdates: 0,
        iphoneProductsCount: 0,
        lastUpdate: null,
        websocketConnections: 0
      };
    }
  }
}

export const priceMonitorService = new PriceMonitorService();