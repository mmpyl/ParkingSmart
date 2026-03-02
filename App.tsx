import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import DataGrid from './components/DataGrid';
import SheetConnectionModal from './components/SheetConnectionModal';
import QuickEntryActions from './components/QuickEntryActions';
import ActiveVehiclesGrid from './components/ActiveVehiclesGrid';
import TicketTemplate from './components/TicketTemplate';
import PrintPreviewModal from './components/PrintPreviewModal';
import EditRowModal from './components/EditRowModal';
import { SheetRow, formatCurrency } from './types';
import { Car, Settings, RefreshCw, Cloud, PlusCircle, AlertTriangle, CheckCircle, WifiOff } from 'lucide-react';
import { useCloudSync } from './hooks/useCloudSync';
import { useParkingActions } from './hooks/useParkingActions';
import { useAppState } from './hooks/useAppState';
import { usePrintManager } from './hooks/usePrintManager';
import { getStorageItem, removeStorageItem, setStorageItem, setStorageJson, storageKeys } from './services/localStorageService';

const App: React.FC = () => {
  const [appState, setAppState] = useAppState();
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'cloud' | 'tariffs' | 'printer' | 'history'>('cloud');
  const [showEditModal, setShowEditModal] = useState(false);
  const [rowToEdit, setRowToEdit] = useState<SheetRow | undefined>(undefined);
  const [sheetUrl, setSheetUrl] = useState<string | null>(() => getStorageItem(storageKeys.sheetUrl));

  const { isSyncing, syncStatus, lastError, syncWithCloud, handleSyncSheet } = useCloudSync({ sheetUrl, setAppState });
  const { rowToPrint, showPrintPreview, setShowPrintPreview, handlePrint, handleConfirmPrint, handleReprint } = usePrintManager({ appState, setAppState });

  const { handleUpdateAllSettings, handleQuickRegister, handleRegisterExit, handleDeleteRow, handleSaveRowMutation } = useParkingActions({
    setAppState,
    syncWithCloud,
    onRequestPrint: handlePrint,
    onCloseEditModal: () => setShowEditModal(false)
  });

  useEffect(() => {
    if (sheetUrl) handleSyncSheet(sheetUrl);
  }, [handleSyncSheet, sheetUrl]);

  useEffect(() => {
    setStorageJson(storageKeys.data, appState.data);
    setStorageJson(storageKeys.tariffs, appState.tariffs);
    setStorageItem(storageKeys.currency, appState.currency);
    const serializablePrintSettings = {
      ...appState.printSettings,
      hardware: { ...appState.printSettings.hardware, device: undefined, interface: undefined }
    };
    setStorageJson(storageKeys.printSettings, serializablePrintSettings);
  }, [appState]);

  const handleEditRow = (row: SheetRow) => {
    setRowToEdit(row);
    setShowEditModal(true);
  };

  const handleOpenSettings = (tab: 'cloud' | 'tariffs' | 'printer' | 'history' = 'cloud') => {
    setSettingsInitialTab(tab);
    setShowSettingsModal(true);
  };

  const totalCajaEfectiva = appState.data
    .filter(r => r.Estado === 'Finalizado')
    .reduce((acc, r) => acc + (Number(r.Total) || 0), 0);

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
      <header className="bg-slate-900 border-b border-slate-800 h-16 flex items-center justify-between px-6 shadow-xl z-20 text-white no-print">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-500/20"><Car size={24} /></div>
          <h1 className="text-xl font-black tracking-tight uppercase">ParkMaster</h1>
        </div>
        <div className="flex items-center gap-4">
          {sheetUrl && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase transition-all ${
              syncStatus === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
              syncStatus === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                'bg-blue-500/10 border-blue-500/20 text-blue-400'
            }`}>
              {syncStatus === 'error' ? <AlertTriangle size={14} /> :
                syncStatus === 'success' ? <CheckCircle size={14} /> :
                  <Cloud size={14} className={isSyncing ? 'animate-pulse' : ''} />}
              {isSyncing ? 'Sincronizando' : syncStatus === 'error' ? 'Error Nube' : syncStatus === 'success' ? 'Sincronizado' : 'Conectado'}
            </div>
          )}
          <button onClick={() => handleSyncSheet(sheetUrl || '')} disabled={isSyncing || !sheetUrl} className="p-2 text-slate-400 hover:text-white rounded-lg transition-all disabled:opacity-30">
            <RefreshCw size={20} className={isSyncing ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => handleOpenSettings('cloud')} className="p-2 text-slate-400 hover:text-white rounded-lg transition-all"><Settings size={20} /></button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden no-print">
        <main className="flex-1 overflow-auto p-8 custom-scrollbar">
          <div className="max-w-6xl mx-auto">
            {syncStatus === 'error' && lastError && (
              <div className="mb-6 bg-red-50 border-2 border-red-100 p-6 rounded-3xl animate-in slide-in-from-top-4">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-red-100 text-red-600 rounded-xl"><WifiOff size={24} /></div>
                  <div className="flex-1">
                    <h4 className="text-red-900 font-black uppercase text-xs tracking-widest mb-1">Error de Sincronización Nube</h4>
                    <p className="text-red-700 text-sm whitespace-pre-wrap font-medium">{lastError}</p>
                    <button onClick={() => handleOpenSettings('cloud')} className="mt-3 text-red-800 text-[10px] font-black uppercase underline underline-offset-4 decoration-2">Revisar Google Apps Script</button>
                  </div>
                </div>
              </div>
            )}

            <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Vehículos Activos</div>
                <div className="text-3xl font-black text-slate-800">{appState.data.filter(r => r.Estado === 'Activo').length}</div>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Caja del Día</div>
                <div className="text-3xl font-black text-green-600">{formatCurrency(totalCajaEfectiva, appState.currency)}</div>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Última Sincronización</div>
                <div className="text-sm font-bold text-slate-600 mt-2">{appState.lastSynced || 'Pendiente de conexión'}</div>
              </div>
            </div>

            <QuickEntryActions onRegister={handleQuickRegister} history={appState.data} tariffs={appState.tariffs} onOpenSettings={() => handleOpenSettings('tariffs')} />
            <ActiveVehiclesGrid data={appState.data} onRegisterExit={handleRegisterExit} onPrintTicket={handlePrint} tariffs={appState.tariffs} currency={appState.currency} />
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-500 uppercase tracking-widest">Historial</h2>
              <button onClick={() => { setRowToEdit(undefined); setShowEditModal(true); }} className="bg-white border border-slate-200 text-blue-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-50">
                <PlusCircle size={14} className="inline mr-2" /> Manual
              </button>
            </div>
            <DataGrid columns={appState.columns} data={appState.data} onDeleteRow={handleDeleteRow} onEditRow={handleEditRow} onPrintTicket={handlePrint} currency={appState.currency} />
          </div>
        </main>
      </div>

      {showSettingsModal && (
        <SheetConnectionModal
          onClose={() => setShowSettingsModal(false)}
          initialTab={settingsInitialTab}
          onConnect={(url) => {
            setSheetUrl(url);
            setStorageItem(storageKeys.sheetUrl, url);
            setShowSettingsModal(false);
            handleSyncSheet(url);
          }}
          onDisconnect={() => {
            setSheetUrl(null);
            removeStorageItem(storageKeys.sheetUrl);
            setShowSettingsModal(false);
          }}
          currentUrl={sheetUrl}
          tariffs={appState.tariffs}
          currency={appState.currency}
          printSettings={appState.printSettings}
          printHistory={appState.printHistory}
          onUpdatePrintHistory={(history) => {
            setStorageJson(storageKeys.printHistory, history);
            setAppState(prev => ({ ...prev, printHistory: history }));
          }}
          onReprint={handleReprint}
          onSaveAllSettings={handleUpdateAllSettings}
        />
      )}

      {showPrintPreview && rowToPrint && (
        <PrintPreviewModal row={rowToPrint} settings={appState.printSettings} tariffs={appState.tariffs} currency={appState.currency} onConfirm={handleConfirmPrint} onCancel={() => setShowPrintPreview(false)} />
      )}

      {showEditModal && (
        <EditRowModal row={rowToEdit} tariffs={appState.tariffs} onClose={() => setShowEditModal(false)} onSave={handleSaveRowMutation} />
      )}

      {rowToPrint && createPortal(
        <TicketTemplate row={rowToPrint} settings={appState.printSettings} tariffs={appState.tariffs} currency={appState.currency} />,
        document.getElementById('ticket-print-container')!
      )}
    </div>
  );
};

export default App;
