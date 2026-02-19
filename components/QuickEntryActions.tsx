
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Car, Bike, Truck, PlusCircle, X, History, AlertCircle, Settings2 } from 'lucide-react';
import { SheetRow, Tariffs } from '../types';

interface QuickEntryActionsProps {
  onRegister: (tipo: string, placa: string, vehiculo: string) => void;
  history: SheetRow[];
  tariffs: Tariffs;
  onOpenSettings?: () => void;
}

const QuickEntryActions: React.FC<QuickEntryActionsProps> = ({ onRegister, history, tariffs, onOpenSettings }) => {
  const [showForm, setShowForm] = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const [placa, setPlaca] = useState('');
  const [vehiculo, setVehiculo] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionRef = useRef<HTMLDivElement>(null);

  const getIconForType = (type: string) => {
    const lower = type.toLowerCase();
    if (lower.includes('moto') || lower.includes('bici')) return <Bike size={18} />;
    if (lower.includes('camion') || lower.includes('carga')) return <Truck size={18} />;
    return <Car size={18} />;
  };

  const getBgForType = (type: string) => {
    const lower = type.toLowerCase();
    if (lower.includes('moto')) return 'bg-orange-500';
    if (lower.includes('camion')) return 'bg-slate-700';
    if (lower.includes('suv')) return 'bg-indigo-500';
    return 'bg-blue-500';
  };

  const activePlates = useMemo(() => {
    return new Set(
      history
        .filter(row => row.Estado === 'Activo')
        .map(row => row.Placa.toUpperCase())
    );
  }, [history]);

  const plateHistory = useMemo(() => {
    const map = new Map<string, { vehiculo: string; tipo: string }>();
    [...history].forEach(row => {
      if (row.Placa && row.Placa !== '-') {
        map.set(row.Placa.toUpperCase(), { 
          vehiculo: String(row.Vehiculo), 
          tipo: String(row.Tipo) 
        });
      }
    });
    return map;
  }, [history]);

  const isPlacaActive = activePlates.has(placa.toUpperCase());

  const suggestions = useMemo(() => {
    if (!placa.trim()) return [];
    const search = placa.toUpperCase();
    return Array.from(plateHistory.keys())
      .filter((p: string) => p.includes(search) && p !== search)
      .slice(0, 5);
  }, [placa, plateHistory]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionRef.current && !suggestionRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectSuggestion = (p: string) => {
    const details = plateHistory.get(p);
    setPlaca(p);
    if (details) {
      setVehiculo(details.vehiculo);
      setSelectedType(details.tipo);
    }
    setShowSuggestions(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (placa.trim() && !isPlacaActive) {
      onRegister(selectedType, placa.toUpperCase(), vehiculo || `${selectedType} genérico`);
      setPlaca('');
      setVehiculo('');
      setShowForm(false);
      setShowSuggestions(false);
    }
  };

  const tariffKeys = Object.keys(tariffs);

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Registros Rápidos</h3>
        <button 
          onClick={onOpenSettings}
          className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
        >
          <Settings2 size={12} />
          Editar Tarifas
        </button>
      </div>
      
      {!showForm ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {tariffKeys.map((type) => (
            <button
              key={type}
              onClick={() => {
                setSelectedType(type);
                setShowForm(true);
              }}
              className="flex flex-col items-center justify-center p-4 rounded-xl bg-white border border-slate-200 hover:border-blue-500 hover:shadow-md transition-all group"
            >
              <div className={`${getBgForType(type)} text-white p-2.5 rounded-lg mb-2 group-hover:scale-110 transition-transform`}>
                {getIconForType(type)}
              </div>
              <span className="text-[10px] font-black uppercase text-slate-700 tracking-tight text-center">{type}</span>
            </button>
          ))}
          {tariffKeys.length === 0 && (
            <div className="col-span-full py-8 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl bg-white/50">
              <p className="text-xs italic mb-2">No has configurado tarifas aún.</p>
              <button onClick={onOpenSettings} className="text-[10px] font-black uppercase text-blue-600 underline">Configurar ahora</button>
            </div>
          )}
        </div>
      ) : (
        <div className={`bg-white border-2 ${isPlacaActive ? 'border-red-500' : 'border-blue-500'} rounded-xl p-4 shadow-xl animate-in fade-in zoom-in duration-200 relative`}>
          <div className="flex justify-between items-center mb-4">
            <span className={`text-sm font-bold ${isPlacaActive ? 'text-red-600' : 'text-blue-600'} flex items-center gap-2`}>
              {isPlacaActive ? 'Error: Vehículo ya en recinto' : `Nuevo Ingreso: ${selectedType}`}
            </span>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-red-500">
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-3 relative">
            <div className="flex-1 relative" ref={suggestionRef}>
              <input
                autoFocus
                type="text"
                placeholder="PLACA (Ej: ABC-123)"
                value={placa}
                onChange={(e) => {
                  setPlaca(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                className={`w-full px-4 py-2 bg-slate-50 border ${isPlacaActive ? 'border-red-300 ring-red-100' : 'border-slate-200 focus:ring-blue-500'} rounded-lg text-sm font-mono font-bold focus:ring-2 outline-none uppercase transition-all`}
                required
              />
              
              {isPlacaActive && (
                <div className="absolute -bottom-6 left-0 flex items-center gap-1 text-[10px] font-bold text-red-500 uppercase animate-in slide-in-from-top-1">
                  <AlertCircle size={10} />
                  Debe registrar la salida antes de un nuevo ingreso
                </div>
              )}

              {showSuggestions && suggestions.length > 0 && !isPlacaActive && (
                <div className="absolute z-50 left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <History size={10} />
                    Sugerencias de Historial
                  </div>
                  {suggestions.map((p) => {
                    const d = plateHistory.get(p);
                    const isActive = activePlates.has(p);
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => !isActive && handleSelectSuggestion(p)}
                        disabled={isActive}
                        className={`w-full px-4 py-2.5 text-left transition-colors flex items-center justify-between border-b border-slate-50 last:border-0 ${isActive ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'hover:bg-blue-50'}`}
                      >
                        <div className="flex flex-col">
                          <span className="font-mono font-bold text-slate-800">{p}</span>
                          <span className="text-[9px] text-slate-400 font-medium">
                            {d?.vehiculo}
                          </span>
                        </div>
                        {isActive ? (
                          <span className="text-[8px] font-black bg-green-100 text-green-700 px-1.5 py-0.5 rounded uppercase">Dentro</span>
                        ) : (
                          <div className="text-[10px] text-slate-300 font-bold uppercase">
                            {d?.tipo}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            
            <input
              type="text"
              placeholder="Vehículo (Opcional)"
              value={vehiculo}
              onChange={(e) => setVehiculo(e.target.value)}
              className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
            
            <button
              type="submit"
              disabled={isPlacaActive || !placa.trim()}
              className={`${isPlacaActive ? 'bg-slate-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'} text-white px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg`}
            >
              <PlusCircle size={16} />
              Ingresar
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default QuickEntryActions;
