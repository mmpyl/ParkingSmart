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
    const parsedPrintSettings = getStorageJson(storageKeys.printSettings, DEFAULT_PRINT_SETTINGS);

    if (parsedPrintSettings.hardware) {
      parsedPrintSettings.hardware.connected = false;
      parsedPrintSettings.hardware.device = undefined;
    }

    return {
      columns: getStorageJson(storageKeys.columns, PARKING_COLUMNS),
      data: getStorageJson(storageKeys.data, DEMO_DATA),
      tariffs: getStorageJson(storageKeys.tariffs, DEFAULT_TARIFA),
      printSettings: parsedPrintSettings,
      printHistory: getStorageJson(storageKeys.printHistory, []),
      currency: getStorageItem(storageKeys.currency) || 'COP',
      lastSynced: getStorageItem(storageKeys.lastSynced) || undefined
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
