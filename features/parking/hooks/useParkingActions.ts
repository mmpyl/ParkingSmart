import { useCallback } from 'react';
import { type Dispatch, type SetStateAction } from 'react';
import { AppState, SheetRow, Tariffs, PrintSettings, BillingUnit, calculateParkingStats } from '../../../types';

const normalizePlate = (value: string) => value.replace(/\s+/g, '').toUpperCase();

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
  const handleUpdateAllSettings = useCallback((tariffs: Tariffs, printSettings: PrintSettings, currency: string, billingUnit: BillingUnit) => {
    setAppState(prev => {
      const next = { ...prev, tariffs, printSettings, currency, billingUnit };
      syncWithCloud(next);
      return next;
    });
  }, [setAppState, syncWithCloud]);

  const handleQuickRegister = useCallback((tipo: string, placa: string, vehiculo: string) => {
    const normalizedPlate = normalizePlate(placa);

    setAppState(prev => {
      if (!normalizedPlate) return prev;

      if (prev.data.some(r => normalizePlate(String(r.Placa)) === normalizedPlate && r.Estado === 'Activo')) return prev;

      const newEntry: SheetRow = {
        id: crypto.randomUUID(),
        Placa: normalizedPlate,
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
      const stats = calculateParkingStats(row.Entrada, row.Tipo, prev.tariffs, exitTimestamp, prev.billingUnit);
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
      const normalizedPlate = normalizePlate(String(updatedRow.Placa || ''));
      const normalizedRow = { ...updatedRow, Placa: normalizedPlate };

      const hasAnotherActiveWithSamePlate = prev.data.some((row) =>
        row.id !== normalizedRow.id &&
        row.Estado === 'Activo' &&
        normalizedRow.Estado === 'Activo' &&
        normalizePlate(String(row.Placa)) === normalizedPlate
      );

      if (hasAnotherActiveWithSamePlate) return prev;

      const exists = prev.data.find(r => r.id === normalizedRow.id);
      const newData = exists
        ? prev.data.map(r => r.id === normalizedRow.id ? normalizedRow : r)
        : [...prev.data, normalizedRow];
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
