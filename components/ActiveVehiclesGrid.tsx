import React, { useState, useEffect, useMemo } from 'react';
import { SheetRow, Tariffs, BillingUnit, calculateParkingStats, formatCurrency } from '../types';
import { LogOut, Clock, Car, Bike, Truck, Timer, Printer, Search } from 'lucide-react';

interface ActiveVehiclesGridProps {
  data: SheetRow[];
  onRegisterExit: (id: string) => void;
  onPrintTicket: (row: SheetRow) => void;
  tariffs: Tariffs;
  currency?: string;
  billingUnit?: BillingUnit;
}

const ActiveVehiclesGrid: React.FC<ActiveVehiclesGridProps> = ({ data, onRegisterExit, onPrintTicket, tariffs, currency = 'COP', billingUnit = 'hour' as BillingUnit }) => {
  const activeVehicles = data.filter(v => v.Estado === 'Activo');
  const [tick, setTick] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
  }, []);

  const getIcon = (type: string) => {
    const lower = type.toLowerCase();
    if (lower.includes('moto') || lower.includes('bici')) return <Bike size={20} />;
    if (lower.includes('camion') || lower.includes('carga')) return <Truck size={20} />;
    return <Car size={20} />;
  };

  const filteredActiveVehicles = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return activeVehicles;

    return activeVehicles.filter((v) => {
      const plate = String(v.Placa || '').toLowerCase();
      const vehicle = String(v.Vehiculo || '').toLowerCase();
      const type = String(v.Tipo || '').toLowerCase();
      return plate.includes(query) || vehicle.includes(query) || type.includes(query);
    });
  }, [activeVehicles, searchTerm]);

  if (activeVehicles.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
          Vehículos en Recinto ({activeVehicles.length})
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        </h3>
        <div className="relative w-full md:w-80">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por placa, modelo o tipo"
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      {filteredActiveVehicles.length === 0 ? (
        <div className="p-6 bg-white border border-slate-200 rounded-2xl text-center text-slate-400 text-sm font-semibold">
          No hay vehículos que coincidan con la búsqueda.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredActiveVehicles.map((v) => {
            const stats = calculateParkingStats(v.Entrada, v.Tipo, tariffs, undefined, billingUnit);
            return (
              <div key={v.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group relative overflow-hidden">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 rounded-lg text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                      {getIcon(v.Tipo)}
                    </div>
                    <div>
                      <div className="font-mono font-bold text-lg text-slate-800 tracking-wider leading-none mb-1">{v.Placa}</div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold truncate max-w-[120px]">{v.Vehiculo}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-blue-600">{formatCurrency(stats.total, currency)}</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Por {stats.chargedUnits} {stats.unitLabel}{stats.chargedUnits > 1 ? 's' : ''}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="bg-slate-50 p-2 rounded-lg flex items-center gap-2">
                    <Clock size={14} className="text-slate-400" />
                    <div className="flex flex-col">
                      <span className="text-[9px] text-slate-400 uppercase font-bold">Ingreso</span>
                      <span className="text-[11px] font-bold text-slate-700">{stats.entryFormatted.split(',')[1]}</span>
                    </div>
                  </div>
                  <div className="bg-blue-50/50 p-2 rounded-lg flex items-center gap-2">
                    <Timer size={14} className="text-blue-400" />
                    <div className="flex flex-col">
                      <span className="text-[9px] text-blue-400 uppercase font-bold">Tiempo</span>
                      <span className="text-[11px] font-bold text-blue-700">{stats.durationText}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => onPrintTicket(v)}
                    className="p-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors"
                    title="Imprimir entrada"
                  >
                    <Printer size={16} />
                  </button>
                  <button
                    onClick={() => onRegisterExit(v.id)}
                    className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-600 transition-colors shadow-lg shadow-slate-900/10"
                  >
                    <LogOut size={14} />
                    Finalizar Cobro
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ActiveVehiclesGrid;
