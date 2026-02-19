
import React, { useState, useEffect } from 'react';
import { X, Save, Calendar, Car, Clock, Hash, Info, Tag } from 'lucide-react';
import { SheetRow, Tariffs, PARKING_COLUMNS } from '../types';

interface EditRowModalProps {
  row?: SheetRow; // Si no hay row, es creación
  onClose: () => void;
  onSave: (row: SheetRow) => void;
  tariffs: Tariffs;
}

const EditRowModal: React.FC<EditRowModalProps> = ({ row, onClose, onSave, tariffs }) => {
  const [formData, setFormData] = useState<Partial<SheetRow>>({
    id: row?.id || crypto.randomUUID(),
    Placa: row?.Placa || '',
    Vehiculo: row?.Vehiculo || '',
    Tipo: row?.Tipo || Object.keys(tariffs)[0] || 'Sedán',
    Entrada: row?.Entrada || new Date().toISOString(),
    Salida: row?.Salida || '-',
    Estado: row?.Estado || 'Activo',
    Total: row?.Total || 0
  });

  const handleChange = (field: keyof SheetRow, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData as SheetRow);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[110] p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        <div className="p-6 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-200">
              <Info size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black uppercase tracking-tight text-slate-900">
                {row ? 'Editar Operación' : 'Nuevo Registro Manual'}
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Editor de Base de Datos</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-all text-slate-400">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-8 space-y-6 custom-scrollbar">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Hash size={12} /> Placa
              </label>
              <input
                required
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold uppercase focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={formData.Placa}
                onChange={e => handleChange('Placa', e.target.value.toUpperCase())}
                placeholder="ABC-123"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Tag size={12} /> Tipo
              </label>
              <select
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={formData.Tipo}
                onChange={e => handleChange('Tipo', e.target.value)}
              >
                {Object.keys(tariffs).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Car size={12} /> Descripción del Vehículo
            </label>
            <input
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              value={formData.Vehiculo}
              onChange={e => handleChange('Vehiculo', e.target.value)}
              placeholder="Ej: Mazda 3 Gris"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Calendar size={12} /> Fecha Entrada
              </label>
              <input
                type="datetime-local"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={formData.Entrada?.substring(0, 16)}
                onChange={e => handleChange('Entrada', new Date(e.target.value).toISOString())}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Clock size={12} /> Estado
              </label>
              <select
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                value={formData.Estado}
                onChange={e => handleChange('Estado', e.target.value)}
              >
                <option value="Activo">Activo</option>
                <option value="Finalizado">Finalizado</option>
              </select>
            </div>
          </div>

          {formData.Estado === 'Finalizado' && (
            <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Calendar size={12} /> Fecha Salida
                </label>
                <input
                  type="datetime-local"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={formData.Salida !== '-' ? formData.Salida?.substring(0, 16) : ''}
                  onChange={e => handleChange('Salida', new Date(e.target.value).toISOString())}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Info size={12} /> Total Cobrado
                </label>
                <input
                  type="number"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-blue-600 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={formData.Total}
                  onChange={e => handleChange('Total', parseFloat(e.target.value))}
                />
              </div>
            </div>
          )}
        </form>

        <div className="p-8 bg-white border-t border-slate-100 flex gap-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-6 py-4 rounded-2xl bg-slate-100 text-slate-500 font-black uppercase tracking-widest text-[10px] hover:bg-slate-200 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className="flex-[2] px-6 py-4 rounded-2xl bg-blue-600 text-white font-black uppercase tracking-widest text-[10px] hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2"
          >
            <Save size={16} />
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditRowModal;
