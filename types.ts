
// @google/genai types and interfaces for the parking application
export interface SheetRow extends Record<string, string | number> {
  id: string;
  Placa: string;
  Vehiculo: string;
  Tipo: string;
  Entrada: string; 
  Salida: string;
  Estado: string;
  Total: number | string;
}

export type Tariffs = Record<string, number>;

export interface PrinterHardware {
  type: 'system' | 'bluetooth' | 'serial';
  name: string;
  connected: boolean;
  device?: any; // Holds the BluetoothDevice or SerialPort instance
  writer?: any; // Holds the writable stream writer
  interface?: any; // Holds specific characteristic or interface
}

export interface PrintHistoryItem {
  id: string;
  rowId: string;
  placa: string;
  tipo: string;
  timestamp: string;
  isExit: boolean;
  total?: number | string;
}

export interface PrintSettings {
  businessName: string;
  nit: string;
  address: string;
  phone: string;
  footerMessage: string;
  autoPrintEntry: boolean;
  paperWidth: '58mm' | '80mm';
  hardware?: PrinterHardware;
}

export enum MessageRole {
  User = 'user',
  Model = 'model'
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  isError?: boolean;
}

export interface AppState {
  columns: string[];
  data: SheetRow[];
  tariffs: Tariffs;
  printSettings: PrintSettings;
  printHistory: PrintHistoryItem[];
  currency: string;
  lastSynced?: string;
}

export const PARKING_COLUMNS = ['Placa', 'Vehiculo', 'Tipo', 'Entrada', 'Salida', 'Estado', 'Total'];

export const DEFAULT_TARIFA: Tariffs = {
  'Sedán': 2000,
  'SUV': 3500,
  'Moto': 1000,
  'Camión': 5000
};

export const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  businessName: 'PARKING MASTER AI',
  nit: '900.000.000-1',
  address: 'Calle Principal #123',
  phone: '300 000 0000',
  footerMessage: 'Gracias por su confianza. No nos hacemos responsables por objetos de valor no reportados.',
  autoPrintEntry: false,
  paperWidth: '80mm',
  hardware: {
    type: 'system',
    name: 'Impresora del Sistema',
    connected: true
  }
};

export const CURRENCY_OPTIONS = [
  { code: 'COP', symbol: '$', label: 'Peso Colombiano' },
  { code: 'USD', symbol: '$', label: 'Dólar Estadounidense' },
  { code: 'MXN', symbol: '$', label: 'Peso Mexicano' },
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'ARS', symbol: '$', label: 'Peso Argentino' },
  { code: 'CLP', symbol: '$', label: 'Peso Chileno' },
  { code: 'PEN', symbol: 'S/', label: 'Sol Peruano' },
];

export const formatCurrency = (amount: number | string, currencyCode: string = 'COP') => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num) || num === 0) {
    const symbol = CURRENCY_OPTIONS.find(c => c.code === currencyCode)?.symbol || '$';
    return `${symbol} 0`;
  }
  
  try {
    return new Intl.NumberFormat('es-CO', { 
      style: 'currency', 
      currency: currencyCode, 
      maximumFractionDigits: 0 
    }).format(num);
  } catch (e) {
    return `${currencyCode} ${num}`;
  }
};

export const calculateParkingStats = (entryDateStr: string, type: string, tariffs: Tariffs = DEFAULT_TARIFA, exitDate?: Date) => {
  try {
    const entry = new Date(entryDateStr);
    const now = exitDate || new Date();
    const diffMs = now.getTime() - entry.getTime();
    
    if (diffMs < 0) return { durationText: '0m', total: 0, chargedHours: 0 };

    const diffMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    
    const chargedHours = Math.max(1, Math.ceil(diffMins / 60));
    const rate = tariffs[type] || tariffs['Default'] || 2000;
    const total = chargedHours * rate;

    return {
      durationText: `${hours}h ${mins}m`,
      total,
      chargedHours,
      entryFormatted: entry.toLocaleString([], { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
      exitFormatted: now.toLocaleString([], { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    };
  } catch (e) {
    return { durationText: 'Error', total: 0, chargedHours: 0 };
  }
};

export const DEMO_DATA: SheetRow[] = [
  { 
    id: '1', 
    Placa: 'ABC-123', 
    Vehiculo: 'Toyota Corolla Blanco', 
    Tipo: 'Sedán', 
    Entrada: new Date(Date.now() - 3600000 * 2.5).toISOString(),
    Salida: '-', 
    Estado: 'Activo', 
    Total: 0 
  }
];
