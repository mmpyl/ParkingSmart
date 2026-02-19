
import React from 'react';
import { X, Printer, CheckCircle2, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import TicketTemplate from './TicketTemplate';
import { SheetRow, PrintSettings, Tariffs } from '../types';

interface PrintPreviewModalProps {
  row: SheetRow;
  settings: PrintSettings;
  tariffs: Tariffs;
  currency: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  row,
  settings,
  tariffs,
  currency,
  onConfirm,
  onCancel
}) => {
  const isExit = row.Estado === 'Finalizado';

  return (
    <div className="fixed inset-0 bg-slate-900/90 flex items-center justify-center z-[100] p-4 backdrop-blur-sm no-print animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl flex flex-col max-h-[95vh] overflow-hidden border border-slate-200">
        
        {/* Header con identificación de tipo de ticket */}
        <div className={`p-6 flex justify-between items-center ${isExit ? 'bg-orange-50 border-b border-orange-100' : 'bg-green-50 border-b border-green-100'}`}>
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${isExit ? 'bg-orange-500 text-white' : 'bg-green-600 text-white shadow-lg shadow-green-200'}`}>
              {isExit ? <ArrowUpCircle size={24} /> : <ArrowDownCircle size={24} />}
            </div>
            <div>
              <h3 className="text-slate-900 font-black uppercase tracking-tighter text-xl">
                Ticket de {isExit ? 'Salida' : 'Ingreso'}
              </h3>
              <p className={`text-[10px] font-black uppercase tracking-widest ${isExit ? 'text-orange-600' : 'text-green-700'}`}>
                {isExit ? 'Procesando cobro final' : 'Nuevo vehículo en recinto'}
              </p>
            </div>
          </div>
          <button 
            onClick={onCancel}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
          >
            <X size={24} />
          </button>
        </div>

        {/* Área de Visualización del Ticket */}
        <div className="flex-1 overflow-auto p-10 flex flex-col items-center justify-start bg-slate-50">
          <div className="relative">
            {/* Efecto de sombra de papel */}
            <div className="absolute -inset-2 bg-slate-200 rounded-sm blur-xl opacity-50" />
            
            <div className="relative bg-white p-8 shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-sm border-t-[6px] border-blue-500 animate-in slide-in-from-bottom-8 duration-500">
               <TicketTemplate 
                 row={row} 
                 settings={settings} 
                 tariffs={tariffs} 
                 currency={currency} 
               />
               
               {/* Efecto decorativo de corte de papel */}
               <div className="absolute -bottom-1 left-0 right-0 flex justify-between overflow-hidden px-1">
                 {[...Array(20)].map((_, i) => (
                   <div key={i} className="w-2 h-2 bg-slate-50 rotate-45 transform translate-y-1" />
                 ))}
               </div>
            </div>
          </div>
          
          <div className="mt-10 text-center space-y-2">
            <div className="flex items-center justify-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-widest">
              <Printer size={14} />
              Configuración: {settings.paperWidth}
            </div>
            <p className="text-slate-500 text-xs font-medium max-w-[280px]">
              Los datos se guardarán automáticamente en el historial después de imprimir.
            </p>
          </div>
        </div>

        {/* Acciones Finales */}
        <div className="p-8 bg-white border-t border-slate-100 flex gap-4">
          <button
            onClick={onCancel}
            className="flex-1 px-6 py-5 rounded-3xl bg-slate-100 text-slate-500 font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all"
          >
            Corregir Datos
          </button>
          <button
            onClick={onConfirm}
            className={`flex-[2] px-6 py-5 rounded-3xl text-white font-black uppercase tracking-widest text-xs transition-all shadow-2xl flex items-center justify-center gap-3 group ${
              isExit 
                ? 'bg-slate-900 hover:bg-orange-600 shadow-slate-900/20' 
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
            }`}
          >
            <CheckCircle2 size={18} className="group-hover:scale-125 transition-transform" />
            Confirmar e Imprimir
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrintPreviewModal;
