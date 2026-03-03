import React from 'react';
import { Activity, Car, CircleDollarSign, Clock3, TrendingUp } from 'lucide-react';
import { AppState, formatCurrency } from '../../../types';

interface AppDashboardProps {
  appState: AppState;
}

const AppDashboard: React.FC<AppDashboardProps> = ({ appState }) => {
  const activeVehicles = appState.data.filter((r) => r.Estado === 'Activo');
  const completedVehicles = appState.data.filter((r) => r.Estado === 'Finalizado');

  const totalRevenue = completedVehicles.reduce((acc, r) => acc + (Number(r.Total) || 0), 0);
  const averageTicket = completedVehicles.length ? Math.round(totalRevenue / completedVehicles.length) : 0;

  const typeCount = appState.data.reduce<Record<string, number>>((acc, row) => {
    acc[row.Tipo] = (acc[row.Tipo] || 0) + 1;
    return acc;
  }, {});

  const maxTypeCount = Math.max(1, ...Object.values(typeCount));

  const recentRows = [...appState.data]
    .sort((a, b) => new Date(b.Entrada).getTime() - new Date(a.Entrada).getTime())
    .slice(0, 5);

  return (
    <section className="mb-8 space-y-4">
      <div className="flex items-center gap-2">
        <Activity size={16} className="text-indigo-600" />
        <h2 className="pm-section-title">Dashboard</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="pm-card p-5">
          <div className="flex items-center justify-between pm-kpi-label">
            Activos Ahora
            <Car size={14} />
          </div>
          <div className="pm-kpi-value pm-kpi-value--lg">{activeVehicles.length}</div>
        </div>

        <div className="pm-card p-5">
          <div className="flex items-center justify-between pm-kpi-label">
            Ingresos Totales
            <CircleDollarSign size={14} />
          </div>
          <div className="pm-kpi-value pm-kpi-value--md pm-kpi-value--success">{formatCurrency(totalRevenue, appState.currency)}</div>
        </div>

        <div className="pm-card p-5">
          <div className="flex items-center justify-between pm-kpi-label">
            Ticket Promedio
            <TrendingUp size={14} />
          </div>
          <div className="pm-kpi-value pm-kpi-value--md pm-kpi-value--primary">{formatCurrency(averageTicket, appState.currency)}</div>
        </div>

        <div className="pm-card p-5">
          <div className="flex items-center justify-between pm-kpi-label">
            Última Sync
            <Clock3 size={14} />
          </div>
          <div className="pm-kpi-value text-xs">{appState.lastSynced || 'Pendiente de conexión'}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="pm-card p-5">
          <h3 className="pm-section-title mb-4">Distribución por tipo</h3>
          <div className="space-y-3">
            {Object.keys(typeCount).length === 0 && (
              <p className="text-xs text-slate-400 font-semibold">Aún no hay datos para mostrar.</p>
            )}
            {Object.entries(typeCount).map(([type, count]) => (
              <div key={type}>
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
                  <span>{type}</span>
                  <span>{count}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500"
                    style={{ width: `${(count / maxTypeCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pm-card p-5">
          <h3 className="pm-section-title mb-4">Últimos ingresos</h3>
          <div className="space-y-2">
            {recentRows.length === 0 && (
              <p className="text-xs text-slate-400 font-semibold">No hay movimientos recientes.</p>
            )}
            {recentRows.map((row) => (
              <div key={row.id} className="pm-card-soft flex items-center justify-between px-3 py-2">
                <div>
                  <div className="text-xs font-black text-slate-800">{row.Placa}</div>
                  <div className="text-[10px] font-semibold text-slate-500">{row.Tipo} · {new Date(row.Entrada).toLocaleString()}</div>
                </div>
                <span className={`pm-status-chip ${row.Estado === 'Activo' ? 'pm-status-chip--active' : 'pm-status-chip--done'}`}>
                  {row.Estado}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AppDashboard;
