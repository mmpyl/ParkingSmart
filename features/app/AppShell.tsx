import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { PlusCircle, WifiOff, AlertTriangle } from 'lucide-react';
import DataGrid from '../../components/DataGrid';
import SheetConnectionModal from '../../components/SheetConnectionModal';
import QuickEntryActions from '../../components/QuickEntryActions';
import ActiveVehiclesGrid from '../../components/ActiveVehiclesGrid';
import TicketTemplate from '../../components/TicketTemplate';
import PrintPreviewModal from '../../components/PrintPreviewModal';
import EditRowModal from '../../components/EditRowModal';
import { SheetRow } from '../../types';
import { useCloudSync } from '../cloud-sync';
import { useAppState, useParkingActions } from '../parking';
import { usePrintManager } from '../printing';
import { getStorageItem, removeStorageItem, setStorageItem, setStorageJson, storageKeys } from '../shared';
import { AppDashboard, AppHeader } from './components';

const AppShell: React.FC = () => {
  const [appState, setAppState] = useAppState();
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'cloud' | 'tariffs' | 'printer' | 'history'>('cloud');
  const [showEditModal, setShowEditModal] = useState(false);
  const [rowToEdit, setRowToEdit] = useState<SheetRow | undefined>(undefined);
  const [sheetUrl, setSheetUrl] = useState<string | null>(() => getStorageItem(storageKeys.sheetUrl));
  const [activeView, setActiveView] = useState<'dashboard' | 'operation'>('operation');

  const { isSyncing, syncStatus, lastError, syncNotice, syncWithCloud, handleSyncSheet } = useCloudSync({ sheetUrl, setAppState });
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
    setStorageItem(storageKeys.billingUnit, appState.billingUnit);
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

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
      <AppHeader
        sheetUrl={sheetUrl}
        syncStatus={syncStatus}
        isSyncing={isSyncing}
        onSync={() => handleSyncSheet(sheetUrl || '')}
        onOpenSettings={() => handleOpenSettings('cloud')}
      />
      <div className="flex flex-1 overflow-hidden no-print">
        <main className="flex-1 overflow-auto p-8 custom-scrollbar">
          <div className="max-w-6xl mx-auto">
            {syncNotice && (
              <div className="mb-6 bg-amber-50 border-2 border-amber-100 p-6 rounded-3xl">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-amber-100 text-amber-700 rounded-xl"><AlertTriangle size={24} /></div>
                  <div className="flex-1">
                    <h4 className="text-amber-900 font-black uppercase text-xs tracking-widest mb-1">Sincronización en modo compatibilidad</h4>
                    <p className="text-amber-700 text-sm whitespace-pre-wrap font-medium">{syncNotice}</p>
                  </div>
                </div>
              </div>
            )}

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

            <div className="mb-6 inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                onClick={() => setActiveView('operation')}
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-colors ${activeView === 'operation' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Operación
              </button>
              <button
                onClick={() => setActiveView('dashboard')}
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-colors ${activeView === 'dashboard' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
              >
                Dashboard
              </button>
            </div>

            {activeView === 'dashboard' ? (
              <AppDashboard appState={appState} />
            ) : (
              <>
                <QuickEntryActions onRegister={handleQuickRegister} history={appState.data} tariffs={appState.tariffs} onOpenSettings={() => handleOpenSettings('tariffs')} />
                <ActiveVehiclesGrid data={appState.data} onRegisterExit={handleRegisterExit} onPrintTicket={handlePrint} tariffs={appState.tariffs} currency={appState.currency} billingUnit={appState.billingUnit} />
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-black text-slate-500 uppercase tracking-widest">Historial</h2>
                  <button onClick={() => { setRowToEdit(undefined); setShowEditModal(true); }} className="bg-white border border-slate-200 text-blue-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-50">
                    <PlusCircle size={14} className="inline mr-2" /> Manual
                  </button>
                </div>
                <DataGrid columns={appState.columns} data={appState.data} onDeleteRow={handleDeleteRow} onEditRow={handleEditRow} onPrintTicket={handlePrint} currency={appState.currency} />
              </>
            )}
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
          billingUnit={appState.billingUnit}
          onSaveAllSettings={handleUpdateAllSettings}
        />
      )}

      {showPrintPreview && rowToPrint && (
        <PrintPreviewModal row={rowToPrint} settings={appState.printSettings} tariffs={appState.tariffs} currency={appState.currency} billingUnit={appState.billingUnit} onConfirm={handleConfirmPrint} onCancel={() => setShowPrintPreview(false)} />
      )}

      {showEditModal && (
        <EditRowModal row={rowToEdit} tariffs={appState.tariffs} existingRows={appState.data} onClose={() => setShowEditModal(false)} onSave={handleSaveRowMutation} />
      )}

      {rowToPrint && createPortal(
        <TicketTemplate row={rowToPrint} settings={appState.printSettings} tariffs={appState.tariffs} currency={appState.currency} billingUnit={appState.billingUnit} />,
        document.getElementById('ticket-print-container')!
      )}
    </div>
  );
};

export default AppShell;
