import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';
import { AppState } from '../types';
import { fetchSheetData, saveSheetData, SheetPayload } from '../services/sheetService';

interface UseCloudSyncParams {
  sheetUrl: string | null;
  setAppState: Dispatch<SetStateAction<AppState>>;
}

export const useCloudSync = ({ sheetUrl, setAppState }: UseCloudSyncParams) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [lastError, setLastError] = useState<string | null>(null);

  const syncWithCloud = useCallback(async (stateToSync: AppState) => {
    if (!sheetUrl || isSyncing) return;

    setIsSyncing(true);
    setSyncStatus('syncing');
    setLastError(null);

    try {
      const payload: SheetPayload = {
        data: stateToSync.data,
        settings: {
          tariffs: stateToSync.tariffs,
          printSettings: stateToSync.printSettings,
          currency: stateToSync.currency
        }
      };

      const success = await saveSheetData(sheetUrl, payload);
      if (success) {
        const now = new Date().toLocaleTimeString();
        setAppState(prev => ({ ...prev, lastSynced: now }));
        localStorage.setItem('parkAi_lastSynced', now);
        setSyncStatus('success');
        setTimeout(() => setSyncStatus('idle'), 3000);
      } else {
        setSyncStatus('error');
        setLastError('Error al guardar: Verifique el script en Google Sheets.');
      }
    } catch (e: any) {
      setSyncStatus('error');
      setLastError(e.message);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, setAppState, sheetUrl]);

  const handleSyncSheet = useCallback(async (url: string) => {
    if (!url || isSyncing) return;

    setIsSyncing(true);
    setSyncStatus('syncing');
    setLastError(null);

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
            ...(result.settings?.printSettings || prev.printSettings),
            hardware: prev.printSettings.hardware
          },
          currency: result.settings?.currency || prev.currency
        }));
        setSyncStatus('success');
        setTimeout(() => setSyncStatus('idle'), 3000);
      }
    } catch (e: any) {
      setSyncStatus('error');
      setLastError(e.message);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, setAppState]);

  return {
    isSyncing,
    syncStatus,
    lastError,
    syncWithCloud,
    handleSyncSheet
  };
};
