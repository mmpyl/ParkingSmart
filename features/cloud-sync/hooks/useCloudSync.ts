import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { AppState, DEFAULT_PRINT_SETTINGS, PrintSettings } from '../../../types';
import { fetchSheetData, saveSheetData, SheetPayload } from '../services/sheetService';
import { setStorageItem, storageKeys } from '../../shared/services/localStorageService';

interface UseCloudSyncParams {
  sheetUrl: string | null;
  setAppState: Dispatch<SetStateAction<AppState>>;
}

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  return 'Error desconocido de sincronización.';
};


const sanitizePrintSettingsForCloud = (settings: PrintSettings): PrintSettings => ({
  ...DEFAULT_PRINT_SETTINGS,
  ...settings,
  hardware: settings.hardware
    ? {
        ...settings.hardware,
        device: undefined,
        interface: undefined,
        writer: undefined,
        connected: settings.hardware.type === 'system' ? true : !!settings.hardware.connected
      }
    : DEFAULT_PRINT_SETTINGS.hardware
});

export const useCloudSync = ({ sheetUrl, setAppState }: UseCloudSyncParams) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [lastError, setLastError] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const idleTimeoutRef = useRef<number | null>(null);

  // Control de concurrencia: evita perder cambios cuando hay múltiples mutaciones seguidas.
  const syncingRef = useRef(false);
  const pendingStateRef = useRef<AppState | null>(null);

  const setSyncSuccess = useCallback(() => {
    setSyncStatus('success');
    if (idleTimeoutRef.current) {
      window.clearTimeout(idleTimeoutRef.current);
    }
    idleTimeoutRef.current = window.setTimeout(() => setSyncStatus('idle'), 3000);
  }, []);

  useEffect(() => {
    return () => {
      if (idleTimeoutRef.current) {
        window.clearTimeout(idleTimeoutRef.current);
      }
    };
  }, []);

  const runCloudSave = useCallback(async (stateToSync: AppState) => {
    if (!sheetUrl) return;

    syncingRef.current = true;
    setIsSyncing(true);
    setSyncStatus('syncing');
    setLastError(null);
    setSyncNotice(null);

    try {
      const payload: SheetPayload = {
        data: stateToSync.data,
        settings: {
          tariffs: stateToSync.tariffs,
          printSettings: sanitizePrintSettingsForCloud(stateToSync.printSettings),
          currency: stateToSync.currency,
          billingUnit: stateToSync.billingUnit
        }
      };

      const result = await saveSheetData(sheetUrl, payload);
      if (result.ok) {
        const now = new Date().toLocaleTimeString();
        setAppState(prev => ({ ...prev, lastSynced: now }));
        setStorageItem(storageKeys.lastSynced, now);
        setSyncSuccess();

        if (result.unverified && result.error) {
          setSyncNotice(result.error);
        }
      } else {
        setSyncStatus('error');
        setLastError(result.error || 'Error al guardar: Verifique el script en Google Sheets.');
      }
    } catch (error: unknown) {
      setSyncStatus('error');
      setLastError(getErrorMessage(error));
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);

      // Si hubo cambios durante el guardado, sincroniza la última versión pendiente.
      const pending = pendingStateRef.current;
      pendingStateRef.current = null;
      if (pending && sheetUrl) {
        await runCloudSave(pending);
      }
    }
  }, [setAppState, setSyncSuccess, sheetUrl]);

  const syncWithCloud = useCallback(async (stateToSync: AppState) => {
    if (!sheetUrl) return;

    if (syncingRef.current) {
      pendingStateRef.current = stateToSync;
      return;
    }

    await runCloudSave(stateToSync);
  }, [runCloudSave, sheetUrl]);

  const handleSyncSheet = useCallback(async (url: string) => {
    if (!url || syncingRef.current) return;

    setIsSyncing(true);
    setSyncStatus('syncing');
    setLastError(null);
    setSyncNotice(null);

    try {
      const result = await fetchSheetData(url);
      if (result) {
        const now = new Date().toLocaleTimeString();
        setAppState(prev => ({
          ...prev,
          data: result.data.length > 0 ? result.data : prev.data,
          lastSynced: now,
          tariffs: result.settings?.tariffs || prev.tariffs,
          printSettings: {
            ...DEFAULT_PRINT_SETTINGS,
            ...prev.printSettings,
            ...(result.settings?.printSettings || {}),
            hardware: prev.printSettings.hardware
          },
          currency: result.settings?.currency || prev.currency,
          billingUnit: result.settings?.billingUnit || prev.billingUnit
        }));
        setSyncSuccess();
      }
    } catch (error: unknown) {
      setSyncStatus('error');
      setLastError(getErrorMessage(error));
    } finally {
      setIsSyncing(false);
    }
  }, [setAppState, setSyncSuccess]);

  return {
    isSyncing,
    syncStatus,
    lastError,
    syncNotice,
    syncWithCloud,
    handleSyncSheet
  };
};
