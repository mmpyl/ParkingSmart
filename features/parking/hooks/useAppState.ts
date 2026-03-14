import { useState } from 'react';
import {
  AppState,
  DEMO_DATA,
  PARKING_COLUMNS,
  DEFAULT_TARIFA,
  DEFAULT_PRINT_SETTINGS
} from '../../../types';
import { getStorageItem, getStorageJson, storageKeys } from '../../shared/services/localStorageService';

const getInitialAppState = (): AppState => {
  try {
    const storedPrintSettings = getStorageJson(storageKeys.printSettings, DEFAULT_PRINT_SETTINGS);
    const parsedPrintSettings = {
      ...DEFAULT_PRINT_SETTINGS,
      ...storedPrintSettings,
      hardware: storedPrintSettings?.hardware ?? DEFAULT_PRINT_SETTINGS.hardware
    };

    if (parsedPrintSettings.hardware) {
      parsedPrintSettings.hardware.connected = parsedPrintSettings.hardware.type === 'system';
      if (parsedPrintSettings.hardware.type !== 'system') {
        parsedPrintSettings.hardware.device = undefined;
        parsedPrintSettings.hardware.interface = undefined;
        parsedPrintSettings.hardware.writer = undefined;
      }
    }

    return {
      columns: getStorageJson(storageKeys.columns, PARKING_COLUMNS),
      data: getStorageJson(storageKeys.data, DEMO_DATA),
      tariffs: getStorageJson(storageKeys.tariffs, DEFAULT_TARIFA),
      printSettings: parsedPrintSettings,
      printHistory: getStorageJson(storageKeys.printHistory, []),
      currency: getStorageItem(storageKeys.currency) || 'COP',
      billingUnit: (getStorageItem(storageKeys.billingUnit) as 'hour' | 'day') || 'hour',
      lastSynced: getStorageItem(storageKeys.lastSynced) || undefined
    };
  } catch {
    return {
      columns: PARKING_COLUMNS,
      data: DEMO_DATA,
      tariffs: DEFAULT_TARIFA,
      printSettings: DEFAULT_PRINT_SETTINGS,
      printHistory: [],
      currency: 'COP',
      billingUnit: 'hour'
    };
  }
};

export const useAppState = () => useState<AppState>(getInitialAppState);
