import { useCallback, useState } from 'react';
import { type Dispatch, type SetStateAction } from 'react';
import { AppState, PrintHistoryItem, SheetRow } from '../../../types';
import { printToHardware } from '../../../utils/printer';
import { setStorageJson, storageKeys } from '../../shared/services/localStorageService';

interface UsePrintManagerParams {
  appState: AppState;
  setAppState: Dispatch<SetStateAction<AppState>>;
}

export const usePrintManager = ({ appState, setAppState }: UsePrintManagerParams) => {
  const [rowToPrint, setRowToPrint] = useState<SheetRow | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  const handlePrint = useCallback((row: SheetRow) => {
    setRowToPrint(row);
    setShowPrintPreview(true);
  }, []);

  const handleConfirmPrint = useCallback(async () => {
    if (!rowToPrint) return;

    const settings = appState.printSettings;
    setShowPrintPreview(false);

    if (settings.hardware && settings.hardware.type !== 'system' && settings.hardware.connected) {
      const result = await printToHardware(rowToPrint, settings, appState.tariffs, appState.currency, appState.billingUnit);
      if (!result.success) {
        alert('Error hardware: ' + result.error);
        window.print();
      }
    } else {
      setTimeout(() => window.print(), 150);
    }

    const historyItem: PrintHistoryItem = {
      id: crypto.randomUUID(),
      rowId: rowToPrint.id,
      placa: rowToPrint.Placa,
      tipo: rowToPrint.Tipo,
      timestamp: new Date().toISOString(),
      isExit: rowToPrint.Estado === 'Finalizado',
      total: rowToPrint.Total
    };

    setAppState(prev => {
      const newHistory = [historyItem, ...prev.printHistory].slice(0, 50);
      setStorageJson(storageKeys.printHistory, newHistory);
      return { ...prev, printHistory: newHistory };
    });
  }, [appState.billingUnit, appState.currency, appState.printSettings, appState.tariffs, rowToPrint, setAppState]);

  const handleReprint = useCallback((historyId: string) => {
    const item = appState.printHistory.find(h => h.id === historyId);
    if (!item) return;

    const row = appState.data.find(r => r.id === item.rowId);
    if (row) handlePrint(row);
  }, [appState.data, appState.printHistory, handlePrint]);

  return {
    rowToPrint,
    showPrintPreview,
    setShowPrintPreview,
    handlePrint,
    handleConfirmPrint,
    handleReprint
  };
};
