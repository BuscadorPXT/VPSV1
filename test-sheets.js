// Test script to check Google Sheets connection and available sheets
import { googleSheetsService } from './dist/services/google-sheets.js';

async function testSheets() {
  try {
    const sheetId = process.env.GOOGLE_SHEET_ID || '1YlTs5a5YP4BkK4vCvvKO7xFWK2f0wEPjc5J0kZB0eQ4';
    console.log('🔍 Testing Google Sheets connection...');
    console.log('📋 Sheet ID:', sheetId);

    const availableSheets = await googleSheetsService.getAvailableSheets(sheetId);
    console.log('✅ Available sheets:', availableSheets);
    console.log('📊 Total sheets:', availableSheets.length);

    // Filter date sheets
    const dateSheets = availableSheets.filter(sheet => /^\d{2}-\d{2}$/.test(sheet));
    console.log('📅 Date sheets found:', dateSheets);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testSheets();
