import { useState } from 'react';
import {
  AppState,
  DEMO_DATA,
  PARKING_COLUMNS,
  DEFAULT_TARIFA,
  DEFAULT_PRINT_SETTINGS
} from '../types';

const getInitialAppState = (): AppState => {
  try {
    const savedData = localStorage.getItem('parkAi_data');
    const savedColumns = localStorage.getItem('parkAi_columns');
    const savedTariffs = localStorage.getItem('parkAi_tariffs');
    const savedPrint = localStorage.getItem('parkAi_printSettings');
    const savedHistory = localStorage.getItem('parkAi_printHistory');
    const savedCurrency = localStorage.getItem('parkAi_currency');
    const lastSynced = localStorage.getItem('parkAi_lastSynced');

    const parsedPrintSettings = savedPrint ? JSON.parse(savedPrint) : DEFAULT_PRINT_SETTINGS;
    if (parsedPrintSettings.hardware) {
      parsedPrintSettings.hardware.connected = false;
      parsedPrintSettings.hardware.device = undefined;
    }

    return {
      columns: savedColumns ? JSON.parse(savedColumns) : PARKING_COLUMNS,
      data: savedData ? JSON.parse(savedData) : DEMO_DATA,
      tariffs: savedTariffs ? JSON.parse(savedTariffs) : DEFAULT_TARIFA,
      printSettings: parsedPrintSettings,
      printHistory: savedHistory ? JSON.parse(savedHistory) : [],
      currency: savedCurrency || 'COP',
      lastSynced: lastSynced || undefined
    };
  } catch {
    return {
      columns: PARKING_COLUMNS,
      data: DEMO_DATA,
      tariffs: DEFAULT_TARIFA,
      printSettings: DEFAULT_PRINT_SETTINGS,
      printHistory: [],
      currency: 'COP'
    };
  }
};

export const useAppState = () => useState<AppState>(getInitialAppState);
