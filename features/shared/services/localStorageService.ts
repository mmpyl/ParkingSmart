export const storageKeys = {
  data: 'parkAi_data',
  columns: 'parkAi_columns',
  tariffs: 'parkAi_tariffs',
  printSettings: 'parkAi_printSettings',
  printHistory: 'parkAi_printHistory',
  currency: 'parkAi_currency',
  lastSynced: 'parkAi_lastSynced',
  sheetUrl: 'parkAi_url'
} as const;

export const getStorageItem = (key: string): string | null => localStorage.getItem(key);

export const setStorageItem = (key: string, value: string): void => {
  localStorage.setItem(key, value);
};

export const removeStorageItem = (key: string): void => {
  localStorage.removeItem(key);
};

export const getStorageJson = <T>(key: string, fallback: T): T => {
  const raw = getStorageItem(key);
  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

export const setStorageJson = (key: string, value: unknown): void => {
  setStorageItem(key, JSON.stringify(value));
};
