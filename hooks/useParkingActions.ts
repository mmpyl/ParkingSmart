import { useCallback } from 'react';
import { type Dispatch, type SetStateAction } from 'react';
import { AppState, SheetRow, Tariffs, PrintSettings, calculateParkingStats } from '../types';

interface UseParkingActionsParams {
  setAppState: Dispatch<SetStateAction<AppState>>;
  syncWithCloud: (stateToSync: AppState) => Promise<void>;
  onRequestPrint: (row: SheetRow) => void;
  onCloseEditModal: () => void;
}

export const useParkingActions = ({
  setAppState,
  syncWithCloud,
  onRequestPrint,
  onCloseEditModal
}: UseParkingActionsParams) => {
  const handleUpdateAllSettings = useCallback((tariffs: Tariffs, printSettings: PrintSettings, currency: string) => {
    setAppState(prev => {
      const next = { ...prev, tariffs, printSettings, currency };
      syncWithCloud(next);
      return next;
    });
  }, [setAppState, syncWithCloud]);

  const handleQuickRegister = useCallback((tipo: string, placa: string, vehiculo: string) => {
    setAppState(prev => {
      if (prev.data.some(r => r.Placa.toUpperCase() === placa.toUpperCase() && r.Estado === 'Activo')) return prev;

      const newEntry: SheetRow = {
        id: crypto.randomUUID(),
        Placa: placa.toUpperCase(),
        Vehiculo: vehiculo,
        Tipo: tipo,
        Entrada: new Date().toISOString(),
        Salida: '-',
        Estado: 'Activo',
        Total: 0
      };

      const next = { ...prev, data: [...prev.data, newEntry] };
      syncWithCloud(next);
      if (prev.printSettings.autoPrintEntry) onRequestPrint(newEntry);
      return next;
    });
  }, [onRequestPrint, setAppState, syncWithCloud]);

  const handleRegisterExit = useCallback((id: string) => {
    setAppState(prev => {
      const row = prev.data.find(r => r.id === id);
      if (!row) return prev;

      const exitTimestamp = new Date();
      const stats = calculateParkingStats(row.Entrada, row.Tipo, prev.tariffs, exitTimestamp);
      const updatedRow = { ...row, Salida: exitTimestamp.toISOString(), Estado: 'Finalizado', Total: stats.total };
      const next = { ...prev, data: prev.data.map(r => r.id === id ? updatedRow : r) };
      syncWithCloud(next);
      onRequestPrint(updatedRow);
      return next;
    });
  }, [onRequestPrint, setAppState, syncWithCloud]);

  const handleDeleteRow = useCallback((id: string) => {
    setAppState(prev => {
      const next = { ...prev, data: prev.data.filter(row => row.id !== id) };
      syncWithCloud(next);
      return next;
    });
  }, [setAppState, syncWithCloud]);

  const handleSaveRowMutation = useCallback((updatedRow: SheetRow) => {
    setAppState(prev => {
      const exists = prev.data.find(r => r.id === updatedRow.id);
      const newData = exists
        ? prev.data.map(r => r.id === updatedRow.id ? updatedRow : r)
        : [...prev.data, updatedRow];
      const next = { ...prev, data: newData };
      syncWithCloud(next);
      return next;
    });

    onCloseEditModal();
  }, [onCloseEditModal, setAppState, syncWithCloud]);

  return {
    handleUpdateAllSettings,
    handleQuickRegister,
    handleRegisterExit,
    handleDeleteRow,
    handleSaveRowMutation
  };
};
