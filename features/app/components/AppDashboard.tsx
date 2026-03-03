import React, { useMemo, useState } from 'react';
import { Activity, CalendarClock, Car, CircleDollarSign, Clock3, Settings2, TrendingUp } from 'lucide-react';
import { AppState, formatCurrency } from '../../../types';

interface AppDashboardProps {
  appState: AppState;
}

type TimeRange = '7d' | '15d' | '30d' | 'all';
type TimeGrouping = 'day' | 'week' | 'month';
type PlateSortMode = 'recent' | 'frequency' | 'revenue';

const rangeToDays: Record<Exclude<TimeRange, 'all'>, number> = {
  '7d': 7,
  '15d': 15,
  '30d': 30
};

const getWeekNumber = (date: Date) => {
  const temp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = temp.getUTCDay() || 7;
  temp.setUTCDate(temp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(temp.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((temp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { year: temp.getUTCFullYear(), week: weekNo };
};

const AppDashboard: React.FC<AppDashboardProps> = ({ appState }) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [timeGrouping, setTimeGrouping] = useState<TimeGrouping>('day');
  const [showTypeDistribution, setShowTypeDistribution] = useState(true);
  const [showTimeline, setShowTimeline] = useState(true);
  const [showPlates, setShowPlates] = useState(true);
  const [plateSortMode, setPlateSortMode] = useState<PlateSortMode>('recent');
  const [plateTypeFilter, setPlateTypeFilter] = useState('all');

  const filteredRows = useMemo(() => {
    if (timeRange === 'all') return appState.data;

    const days = rangeToDays[timeRange];
    const from = new Date();
    from.setDate(from.getDate() - days);

    return appState.data.filter((row) => new Date(row.Entrada) >= from);
  }, [appState.data, timeRange]);

  const activeVehicles = filteredRows.filter((r) => r.Estado === 'Activo');
  const completedVehicles = filteredRows.filter((r) => r.Estado === 'Finalizado');

  const totalRevenue = completedVehicles.reduce((acc, r) => acc + (Number(r.Total) || 0), 0);
  const averageTicket = completedVehicles.length ? Math.round(totalRevenue / completedVehicles.length) : 0;

  const typeCount = filteredRows.reduce<Record<string, number>>((acc, row) => {
    acc[row.Tipo] = (acc[row.Tipo] || 0) + 1;
    return acc;
  }, {});

  const vehicleTypes = useMemo(() => ['all', ...Object.keys(typeCount)], [typeCount]);

  const maxTypeCount = Math.max(1, ...Object.values(typeCount));

  const timelineItems = useMemo(() => {
    const grouped = filteredRows.reduce<Record<string, { dateLabel: string; entries: number; exits: number; revenue: number; timestamp: number }>>((acc, row) => {
      const date = new Date(row.Entrada);
      let key = '';
      let label = '';

      if (timeGrouping === 'month') {
        key = `${date.getFullYear()}-${date.getMonth()}`;
        label = date.toLocaleDateString('es-CO', { month: 'short', year: 'numeric' });
      } else if (timeGrouping === 'week') {
        const { year, week } = getWeekNumber(date);
        key = `${year}-W${week}`;
        label = `Sem ${week} · ${year}`;
      } else {
        key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
        label = date.toLocaleDateString('es-CO', { weekday: 'short', day: '2-digit', month: 'short' });
      }

      if (!acc[key]) {
        acc[key] = { dateLabel: label, entries: 0, exits: 0, revenue: 0, timestamp: date.getTime() };
      }

      acc[key].entries += 1;

      if (row.Estado === 'Finalizado') {
        acc[key].exits += 1;
        acc[key].revenue += Number(row.Total) || 0;
      }

      return acc;
    }, {});

    return Object.entries(grouped)
      .map(([id, value]) => ({ id, ...value }))
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [filteredRows, timeGrouping]);

  const maxTimelineEntries = Math.max(1, ...timelineItems.map((item) => item.entries));

  const plateStats = useMemo(() => {
    const grouped = filteredRows.reduce<Record<string, { count: number; lastEntry: number; type: string; revenue: number }>>((acc, row) => {
      if (plateTypeFilter !== 'all' && row.Tipo !== plateTypeFilter) return acc;

      if (!acc[row.Placa]) {
        acc[row.Placa] = { count: 0, lastEntry: 0, type: row.Tipo, revenue: 0 };
      }
      acc[row.Placa].count += 1;
      acc[row.Placa].lastEntry = Math.max(acc[row.Placa].lastEntry, new Date(row.Entrada).getTime());
      acc[row.Placa].type = row.Tipo;
      if (row.Estado === 'Finalizado') acc[row.Placa].revenue += Number(row.Total) || 0;

      return acc;
    }, {});

    const items = Object.entries(grouped).map(([placa, data]) => ({ placa, ...data }));

    if (plateSortMode === 'frequency') {
      items.sort((a, b) => b.count - a.count || b.lastEntry - a.lastEntry);
    } else if (plateSortMode === 'revenue') {
      items.sort((a, b) => b.revenue - a.revenue || b.lastEntry - a.lastEntry);
    } else {
      items.sort((a, b) => b.lastEntry - a.lastEntry);
    }

    return items.slice(0, 8);
  }, [filteredRows, plateSortMode, plateTypeFilter]);

  return (
    <section className="mb-8 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-indigo-600" />
          <h2 className="pm-section-title">Dashboard</h2>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
          <Settings2 size={12} /> Opciones de visualización
        </div>
      </div>

      <div className="pm-card p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="pm-kpi-label block mb-1">Rango de tiempo</label>
            <select value={timeRange} onChange={(e) => setTimeRange(e.target.value as TimeRange)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold bg-white">
              <option value="7d">Últimos 7 días</option>
              <option value="15d">Últimos 15 días</option>
              <option value="30d">Últimos 30 días</option>
              <option value="all">Todo el histórico</option>
            </select>
          </div>
          <div>
            <label className="pm-kpi-label block mb-1">Segmentación</label>
            <select value={timeGrouping} onChange={(e) => setTimeGrouping(e.target.value as TimeGrouping)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold bg-white">
              <option value="day">Diaria</option>
              <option value="week">Semanal</option>
              <option value="month">Mensual</option>
            </select>
          </div>
          <div>
            <label className="pm-kpi-label block mb-1">Datos a mostrar</label>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setShowTypeDistribution((v) => !v)} className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase ${showTypeDistribution ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>Tipos</button>
              <button onClick={() => setShowTimeline((v) => !v)} className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase ${showTimeline ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>Timeline</button>
              <button onClick={() => setShowPlates((v) => !v)} className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase ${showPlates ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>Placas</button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="pm-card p-5"><div className="flex items-center justify-between pm-kpi-label">Activos Ahora<Car size={14} /></div><div className="pm-kpi-value pm-kpi-value--lg">{activeVehicles.length}</div></div>
        <div className="pm-card p-5"><div className="flex items-center justify-between pm-kpi-label">Ingresos Totales<CircleDollarSign size={14} /></div><div className="pm-kpi-value pm-kpi-value--md pm-kpi-value--success">{formatCurrency(totalRevenue, appState.currency)}</div></div>
        <div className="pm-card p-5"><div className="flex items-center justify-between pm-kpi-label">Ticket Promedio<TrendingUp size={14} /></div><div className="pm-kpi-value pm-kpi-value--md pm-kpi-value--primary">{formatCurrency(averageTicket, appState.currency)}</div></div>
        <div className="pm-card p-5"><div className="flex items-center justify-between pm-kpi-label">Última Sync<Clock3 size={14} /></div><div className="pm-kpi-value text-xs">{appState.lastSynced || 'Pendiente de conexión'}</div></div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {showTypeDistribution && (
          <div className="pm-card p-5">
            <h3 className="pm-section-title mb-4">Distribución por tipo</h3>
            <div className="space-y-3">
              {Object.keys(typeCount).length === 0 && <p className="text-xs text-slate-400 font-semibold">Aún no hay datos para mostrar.</p>}
              {Object.entries(typeCount).map(([type, count]) => (
                <div key={type}>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1"><span>{type}</span><span>{count}</span></div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-indigo-500" style={{ width: `${(count / maxTypeCount) * 100}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {showTimeline && (
          <div className="pm-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="pm-section-title">Línea de tiempo</h3>
              <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1"><CalendarClock size={12} /> Segmentación {timeGrouping === 'day' ? 'diaria' : timeGrouping === 'week' ? 'semanal' : 'mensual'}</span>
            </div>
            <div className="space-y-2">
              {timelineItems.length === 0 && <p className="text-xs text-slate-400 font-semibold">No hay movimientos para el rango seleccionado.</p>}
              {timelineItems.map((item) => (
                <div key={item.id} className="pm-card-soft px-3 py-3">
                  <div className="flex items-center justify-between mb-2"><div className="text-xs font-black text-slate-800 uppercase">{item.dateLabel}</div><div className="text-[10px] font-bold text-emerald-600">{formatCurrency(item.revenue, appState.currency)}</div></div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden mb-2"><div className="h-full bg-indigo-500" style={{ width: `${(item.entries / maxTimelineEntries) * 100}%` }} /></div>
                  <div className="text-[10px] text-slate-500 font-semibold">Ingresos: {item.entries} · Salidas: {item.exits}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {showPlates && (
          <div className="pm-card p-5">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="pm-section-title">Placas recientes/frecuentes</h3>
              <select value={plateSortMode} onChange={(e) => setPlateSortMode(e.target.value as PlateSortMode)} className="border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-bold bg-white">
                <option value="recent">Más recientes</option>
                <option value="frequency">Más recurrentes</option>
                <option value="revenue">Mayor facturación</option>
              </select>
            </div>
            <div className="mb-3">
              <select value={plateTypeFilter} onChange={(e) => setPlateTypeFilter(e.target.value)} className="w-full border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-bold bg-white">
                {vehicleTypes.map((type) => <option key={type} value={type}>{type === 'all' ? 'Todos los tipos' : type}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              {plateStats.length === 0 && <p className="text-xs text-slate-400 font-semibold">No hay placas para el rango seleccionado.</p>}
              {plateStats.map((item) => (
                <div key={item.placa} className="pm-card-soft px-3 py-2 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-black text-slate-800 font-mono">{item.placa}</div>
                    <div className="text-[10px] text-slate-500 font-semibold">{item.type}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-black text-indigo-600">{item.count} mov.</div>
                    <div className="text-[9px] text-emerald-600 font-bold">{formatCurrency(item.revenue, appState.currency)}</div>
                    <div className="text-[9px] text-slate-400">{new Date(item.lastEntry).toLocaleDateString('es-CO')}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default AppDashboard;
