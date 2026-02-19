
import { SheetRow, Tariffs, PrintSettings } from "../types";

export interface SheetPayload {
  data: SheetRow[];
  settings: {
    tariffs: Tariffs;
    printSettings: PrintSettings;
    currency: string;
  }
}

/**
 * NUEVO CODIGO RECOMENDADO PARA GOOGLE APPS SCRIPT:
 * (Copiar y Reemplazar en su Apps Script de Google)
 * 
 * function doPost(e) {
 *   try {
 *     var payload = JSON.parse(e.postData.contents);
 *     var ss = SpreadsheetApp.getActiveSpreadsheet();
 *     
 *     // 1. Guardar Datos de Vehículos
 *     var sheetData = ss.getSheetByName('Data') || ss.insertSheet('Data');
 *     sheetData.clear();
 *     if (payload.data && payload.data.length > 0) {
 *       var headers = Object.keys(payload.data[0]);
 *       sheetData.appendRow(headers);
 *       var allValues = payload.data.map(function(row) {
 *         return headers.map(function(h) { return row[h]; });
 *       });
 *       sheetData.getRange(2, 1, allValues.length, headers.length).setValues(allValues);
 *     }
 *     
 *     // 2. Guardar Configuraciones (Tarifas, Moneda, Impresora)
 *     var sheetSettings = ss.getSheetByName('Settings') || ss.insertSheet('Settings');
 *     sheetSettings.clear();
 *     sheetSettings.appendRow(['Clave', 'Valor JSON', 'Fecha Actualización']);
 *     sheetSettings.appendRow(['config', JSON.stringify(payload.settings), new Date()]);
 *     
 *     return ContentService.createTextOutput(JSON.stringify({status: 'success'}))
 *       .setMimeType(ContentService.MimeType.JSON);
 *   } catch(err) {
 *     return ContentService.createTextOutput(JSON.stringify({status: 'error', message: err.toString()}))
 *       .setMimeType(ContentService.MimeType.JSON);
 *   }
 * }
 */

const getCleanUrl = (url: string): string => {
  let clean = url.trim();
  if (!clean.startsWith('https://script.google.com')) {
    throw new Error("URL inválida de Google Apps Script.");
  }
  return clean.split('?')[0];
};

export const fetchSheetData = async (scriptUrl: string): Promise<SheetPayload | null> => {
  if (!scriptUrl) return null;
  try {
    const cleanUrl = getCleanUrl(scriptUrl);
    const response = await fetch(`${cleanUrl}?action=read&t=${Date.now()}`, {
      method: 'GET',
      mode: 'cors',
      redirect: 'follow',
      headers: { 'Accept': 'application/json' }
    });
    const result = await response.json();
    if (result && result.status === 'success') {
      return {
        data: (result.data || []).map((row: any) => ({
          ...row,
          id: row.id || crypto.randomUUID(),
          Total: isNaN(Number(row.Total)) ? 0 : Number(row.Total)
        })),
        settings: result.settings || null
      };
    }
    return null;
  } catch (error) {
    console.error("Error leyendo de la nube:", error);
    throw error;
  }
};

export const saveSheetData = async (scriptUrl: string, payload: SheetPayload): Promise<boolean> => {
  if (!scriptUrl) return false;
  try {
    const cleanUrl = getCleanUrl(scriptUrl);
    await fetch(cleanUrl, {
      method: 'POST',
      mode: 'no-cors', 
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
    return true; 
  } catch (error) {
    console.error("Error guardando en la nube:", error);
    return false;
  }
};
