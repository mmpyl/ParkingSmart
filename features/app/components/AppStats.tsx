import React from 'react';
import { AppState, formatCurrency } from '../../../types';

interface AppStatsProps {
  appState: AppState;
}

const AppStats: React.FC<AppStatsProps> = ({ appState }) => {
  const totalCajaEfectiva = appState.data
    .filter(r => r.Estado === 'Finalizado')
    .reduce((acc, r) => acc + (Number(r.Total) || 0), 0);

  return (
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
  );
};

export default AppStats;
