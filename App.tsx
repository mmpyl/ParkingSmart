
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import DataGrid from './components/DataGrid';
import SheetConnectionModal from './components/SheetConnectionModal';
import QuickEntryActions from './components/QuickEntryActions';
import ActiveVehiclesGrid from './components/ActiveVehiclesGrid';
import TicketTemplate from './components/TicketTemplate';
import PrintPreviewModal from './components/PrintPreviewModal';
import EditRowModal from './components/EditRowModal';
import { 
  SheetRow, 
  AppState, 
  DEMO_DATA, 
  PARKING_COLUMNS, 
  calculateParkingStats,
  formatCurrency,
  Tariffs,
  DEFAULT_TARIFA,
  PrintSettings,
  DEFAULT_PRINT_SETTINGS,
  PrintHistoryItem
} from './types';
import { fetchSheetData, saveSheetData, SheetPayload } from './services/sheetService';
import { printToHardware } from './utils/printer';
import { 
  Car, 
  Settings,
  RefreshCw,
  Cloud,
  PlusCircle,
  AlertTriangle,
  CheckCircle,
  WifiOff
} from 'lucide-react';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(() => {
    try {
      const savedData = localStorage.getItem('parkAi_data');
      const savedColumns = localStorage.getItem('parkAi_columns');
      const savedTariffs = localStorage.getItem('parkAi_tariffs');
      const savedPrint = localStorage.getItem('parkAi_printSettings');
      const savedHistory = localStorage.getItem('parkAi_printHistory');
      const savedCurrency = localStorage.getItem('parkAi_currency');
      const lastSynced = localStorage.getItem('parkAi_lastSynced');
      
      const parsedPrintSettings = savedPrint ? JSON.parse(savedPrint) : DEFAULT_PRINT_SETTINGS;
      if (parsedPrintSettings.hardware) {
        parsedPrintSettings.hardware.connected = false;
        parsedPrintSettings.hardware.device = undefined;
      }

      return {
        columns: savedColumns ? JSON.parse(savedColumns) : PARKING_COLUMNS,
        data: savedData ? JSON.parse(savedData) : DEMO_DATA,
        tariffs: savedTariffs ? JSON.parse(savedTariffs) : DEFAULT_TARIFA,
        printSettings: parsedPrintSettings,
        printHistory: savedHistory ? JSON.parse(savedHistory) : [],
        currency: savedCurrency || 'COP',
        lastSynced: lastSynced || undefined
      };
    } catch (e) {
      return {
        columns: PARKING_COLUMNS,
        data: DEMO_DATA,
        tariffs: DEFAULT_TARIFA,
        printSettings: DEFAULT_PRINT_SETTINGS,
        printHistory: [],
        currency: 'COP'
      };
    }
  });
  
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'cloud' | 'tariffs' | 'printer' | 'history'>('cloud');
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [rowToEdit, setRowToEdit] = useState<SheetRow | undefined>(undefined);
  const [sheetUrl, setSheetUrl] = useState<string | null>(() => localStorage.getItem('parkAi_url'));
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [lastError, setLastError] = useState<string | null>(null);
  const [rowToPrint, setRowToPrint] = useState<SheetRow | null>(null);

  // Sincronización robusta con la nube
  const syncWithCloud = async (stateToSync: AppState) => {
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
        setLastError("Error al guardar: Verifique el script en Google Sheets.");
      }
    } catch (e: any) {
      setSyncStatus('error');
      setLastError(e.message);
    } finally {
      setIsSyncing(false);
    }
  };

  // Función unificada para guardar configuraciones y evitar múltiples peticiones
  const handleUpdateAllSettings = (tariffs: Tariffs, printSettings: PrintSettings, currency: string) => {
    setAppState(prev => {
      const next = { ...prev, tariffs, printSettings, currency };
      syncWithCloud(next);
      return next;
    });
  };

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
  }, [isSyncing]);

  useEffect(() => {
    if (sheetUrl) handleSyncSheet(sheetUrl);
  }, [sheetUrl]);

  // Persistencia local automática
  useEffect(() => {
    localStorage.setItem('parkAi_data', JSON.stringify(appState.data));
    localStorage.setItem('parkAi_tariffs', JSON.stringify(appState.tariffs));
    localStorage.setItem('parkAi_currency', appState.currency);
    const sToSave = { ...appState.printSettings, hardware: { ...appState.printSettings.hardware, device: undefined, interface: undefined } };
    localStorage.setItem('parkAi_printSettings', JSON.stringify(sToSave));
  }, [appState]);

  const handleQuickRegister = (tipo: string, placa: string, vehiculo: string) => {
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
      if (prev.printSettings.autoPrintEntry) handlePrint(newEntry);
      return next;
    });
  };

  const handleRegisterExit = (id: string) => {
    setAppState(prev => {
      const row = prev.data.find(r => r.id === id);
      if (!row) return prev;
      const exitTimestamp = new Date();
      const stats = calculateParkingStats(row.Entrada, row.Tipo, prev.tariffs, exitTimestamp);
      const updatedRow = { ...row, Salida: exitTimestamp.toISOString(), Estado: 'Finalizado', Total: stats.total };
      const next = { ...prev, data: prev.data.map(r => r.id === id ? updatedRow : r) };
      syncWithCloud(next);
      handlePrint(updatedRow);
      return next;
    });
  };

  const handleDeleteRow = (id: string) => {
    setAppState(prev => {
      const next = { ...prev, data: prev.data.filter(row => row.id !== id) };
      syncWithCloud(next);
      return next;
    });
  };

  const handleSaveRowMutation = (updatedRow: SheetRow) => {
    setAppState(prev => {
      const exists = prev.data.find(r => r.id === updatedRow.id);
      const newData = exists 
        ? prev.data.map(r => r.id === updatedRow.id ? updatedRow : r)
        : [...prev.data, updatedRow];
      const next = { ...prev, data: newData };
      syncWithCloud(next);
      return next;
    });
    setShowEditModal(false);
  };

  const handleEditRow = (row: SheetRow) => { setRowToEdit(row); setShowEditModal(true); };
  const handlePrint = (row: SheetRow) => { setRowToPrint(row); setShowPrintPreview(true); };

  const handleConfirmPrint = async () => {
    if (!rowToPrint) return;
    const settings = appState.printSettings;
    setShowPrintPreview(false);
    
    if (settings.hardware && settings.hardware.type !== 'system' && settings.hardware.connected) {
       const result = await printToHardware(rowToPrint, settings, appState.tariffs, appState.currency);
       if (!result.success) { alert("Error hardware: " + result.error); window.print(); }
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
      localStorage.setItem('parkAi_printHistory', JSON.stringify(newHistory));
      return { ...prev, printHistory: newHistory };
    });
  };

  const handleReprint = (historyId: string) => {
    const item = appState.printHistory.find(h => h.id === historyId);
    if (item) {
      const row = appState.data.find(r => r.id === item.rowId);
      if (row) handlePrint(row);
    }
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
            localStorage.setItem('parkAi_url', url);
            setShowSettingsModal(false);
            handleSyncSheet(url);
          }}
          onDisconnect={() => {
            setSheetUrl(null);
            localStorage.removeItem('parkAi_url');
            setShowSettingsModal(false);
          }}
          currentUrl={sheetUrl}
          tariffs={appState.tariffs}
          currency={appState.currency}
          printSettings={appState.printSettings}
          printHistory={appState.printHistory}
          onUpdatePrintHistory={(h) => setAppState(prev => ({...prev, printHistory: h}))}
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
