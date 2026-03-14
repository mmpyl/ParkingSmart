import React from 'react';
import { PlusCircle } from 'lucide-react';
import DataGrid from '../../../components/DataGrid';
import QuickEntryActions from '../../../components/QuickEntryActions';
import ActiveVehiclesGrid from '../../../components/ActiveVehiclesGrid';
import { AppState, SheetRow } from '../../../types';

interface OperationViewProps {
  appState: AppState;
  onOpenSettingsTariffs: () => void;
  onPrint: (row: SheetRow) => void;
  onRegisterExit: (id: string) => void;
  onDeleteRow: (id: string) => void;
  onEditRow: (row: SheetRow) => void;
  onOpenManualEntry: () => void;
  onQuickRegister: (tipo: string, placa: string, vehiculo: string) => void;
}

const OperationView: React.FC<OperationViewProps> = ({
  appState,
  onOpenSettingsTariffs,
  onPrint,
  onRegisterExit,
  onDeleteRow,
  onEditRow,
  onOpenManualEntry,
  onQuickRegister,
}) => {
  return (
    <>
      <QuickEntryActions
        onRegister={onQuickRegister}
        history={appState.data}
        tariffs={appState.tariffs}
        onOpenSettings={onOpenSettingsTariffs}
      />
      <ActiveVehiclesGrid
        data={appState.data}
        onRegisterExit={onRegisterExit}
        onPrintTicket={onPrint}
        tariffs={appState.tariffs}
        currency={appState.currency}
        billingUnit={appState.billingUnit}
      />
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-black text-slate-500 uppercase tracking-widest">Historial</h2>
        <button onClick={onOpenManualEntry} className="bg-white border border-slate-200 text-blue-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-50">
          <PlusCircle size={14} className="inline mr-2" /> Manual
        </button>
      </div>
      <DataGrid
        columns={appState.columns}
        data={appState.data}
        onDeleteRow={onDeleteRow}
        onEditRow={onEditRow}
        onPrintTicket={onPrint}
        currency={appState.currency}
      />
    </>
  );
};

export default OperationView;
