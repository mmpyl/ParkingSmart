import React from 'react';
import { Car, Settings, RefreshCw, Cloud, AlertTriangle, CheckCircle } from 'lucide-react';

interface AppHeaderProps {
  sheetUrl: string | null;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  isSyncing: boolean;
  onSync: () => void;
  onOpenSettings: () => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({
  sheetUrl,
  syncStatus,
  isSyncing,
  onSync,
  onOpenSettings
}) => {
  return (
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

        <button onClick={onSync} disabled={isSyncing || !sheetUrl} className="p-2 text-slate-400 hover:text-white rounded-lg transition-all disabled:opacity-30">
          <RefreshCw size={20} className={isSyncing ? 'animate-spin' : ''} />
        </button>
        <button onClick={onOpenSettings} className="p-2 text-slate-400 hover:text-white rounded-lg transition-all"><Settings size={20} /></button>
      </div>
    </header>
  );
};

export default AppHeader;
