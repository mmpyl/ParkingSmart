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

    const hardwareType = settings.hardware?.type ?? 'system';
    const isSystemMode = hardwareType === 'system';
    let printWasSent = false;

    const runBrowserPrint = () => {
      printWasSent = true;
      setTimeout(() => window.print(), 150);
    };

    const canTryHardware = !!settings.hardware && !isSystemMode && (settings.hardware.connected || !!settings.hardware.device);

    if (isSystemMode) {
      runBrowserPrint();
    } else if (canTryHardware) {
      const result = await printToHardware(rowToPrint, settings, appState.tariffs, appState.currency, appState.billingUnit);
      if (result.success) {
        printWasSent = true;
      } else {
        const errorMsg = 'Error hardware: ' + result.error;
        if (settings.browserPrintFallbackOnHardwareError) {
          alert(errorMsg + ' Se utilizará impresión del navegador (PDF/impresora del sistema).');
          runBrowserPrint();
        } else {
          alert(errorMsg + ' No se enviará a PDF automáticamente. Revise conexión o cambie a "Modo Impresora del Sistema".');
        }
      }
    } else {
      alert('Modo térmico seleccionado, pero no hay impresora conectada. Conéctela en Ajustes > Ticket para imprimir por hardware.');
      return;
    }

    if (!printWasSent) {
      return;
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
