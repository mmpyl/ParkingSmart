
import React from 'react';
import { SheetRow, formatCurrency } from '../types';
import { Trash2, Car, Clock, CheckCircle2, Calendar, Printer, Edit2 } from 'lucide-react';

interface DataGridProps {
  columns: string[];
  data: SheetRow[];
  onDeleteRow: (id: string) => void;
  onEditRow?: (row: SheetRow) => void;
  onPrintTicket?: (row: SheetRow) => void;
  currency?: string;
}

const DataGrid: React.FC<DataGridProps> = ({ columns, data, onDeleteRow, onEditRow, onPrintTicket, currency = 'COP' }) => {
  const formatTableValue = (col: string, val: any) => {
    if (col === 'Estado') {
      return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
          val === 'Activo' 
            ? 'bg-green-100 text-green-700 border border-green-200' 
            : 'bg-slate-100 text-slate-500 border border-slate-200'
        }`}>
          {val === 'Activo' ? <Clock size={10} /> : <CheckCircle2 size={10} />}
          {val}
        </span>
      );
    }
    
    if (col === 'Placa') {
      return (
        <span className="font-mono font-bold bg-slate-100 px-2 py-1 rounded border border-slate-200 text-slate-800 tracking-tight text-xs">
          {val}
        </span>
      );
    }
    
    if (col === 'Total') {
      return <span className="font-bold text-slate-900 text-sm">{formatCurrency(val, currency)}</span>;
    }

    if ((col === 'Entrada' || col === 'Salida') && val !== '-') {
      try {
        const date = new Date(val);
        return (
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Calendar size={12} className="text-slate-400" />
            <span>{date.toLocaleDateString([], { day: '2-digit', month: '2-digit' })}</span>
            <span className="font-bold text-slate-400">|</span>
            <span className="font-medium">{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        );
      } catch (e) {
        return <span className="text-xs text-slate-600">{val}</span>;
      }
    }

    return <span className="text-xs text-slate-600 font-medium">{val}</span>;
  };

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-80 text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl bg-white/50">
        <Car size={48} className="mb-4 opacity-20" />
        <p className="font-bold text-lg text-slate-500 uppercase tracking-tight">Sin Movimientos</p>
        <p className="text-sm">Registra ingresos para ver el historial</p>
      </div>
    );
  }

  const sortedData = [...data].sort((a, b) => new Date(b.Entrada).getTime() - new Date(a.Entrada).getTime());

  return (
    <div className="overflow-hidden border border-slate-200 rounded-3xl shadow-sm bg-white">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col}
                  scope="col"
                  className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest"
                >
                  {col}
                </th>
              ))}
              <th scope="col" className="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-50">
            {sortedData.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50/50 transition-colors group">
                {columns.map((col) => (
                  <td key={`${row.id}-${col}`} className="px-6 py-3.5 whitespace-nowrap">
                    {formatTableValue(col, row[col])}
                  </td>
                ))}
                <td className="px-6 py-3.5 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1">
                    {onEditRow && (
                      <button
                        onClick={() => onEditRow(row)}
                        className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all"
                        title="Editar Registro"
                      >
                        <Edit2 size={14} />
                      </button>
                    )}
                    {onPrintTicket && (
                      <button
                        onClick={() => onPrintTicket(row)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                        title="Re-imprimir Ticket"
                      >
                        <Printer size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => onDeleteRow(row.id)}
                      className="p-2 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataGrid;
