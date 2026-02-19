
import React, { useState } from 'react';
import { X, Link, Trash2, Wallet, Printer, Bluetooth, Usb, Cpu, AlertCircle, History, PrinterCheck, Edit2, Loader2, ExternalLink, Plus } from 'lucide-react';
import { Tariffs, PrintSettings, CURRENCY_OPTIONS, PrinterHardware, DEFAULT_PRINT_SETTINGS, PrintHistoryItem } from '../types';

interface SheetConnectionModalProps {
  onClose: () => void;
  onConnect: (url: string) => void;
  onDisconnect?: () => void;
  currentUrl: string | null;
  tariffs: Tariffs;
  currency: string;
  printSettings: PrintSettings;
  printHistory: PrintHistoryItem[];
  onUpdatePrintHistory: (newHistory: PrintHistoryItem[]) => void;
  onReprint: (historyId: string) => void;
  onSaveAllSettings: (tariffs: Tariffs, printSettings: PrintSettings, currency: string) => void;
  initialTab?: 'cloud' | 'tariffs' | 'printer' | 'history';
}

const SheetConnectionModal: React.FC<SheetConnectionModalProps> = ({ 
  onClose, 
  onConnect, 
  currentUrl,
  tariffs,
  currency,
  printSettings,
  printHistory,
  onUpdatePrintHistory,
  onReprint,
  onSaveAllSettings,
  initialTab = 'cloud'
}) => {
  const [activeTab, setActiveTab] = useState<'cloud' | 'tariffs' | 'printer' | 'history'>(initialTab);
  const [url, setUrl] = useState(currentUrl || '');
  const [localTariffs, setLocalTariffs] = useState<Tariffs>({ ...tariffs });
  const [localPrint, setLocalPrint] = useState<PrintSettings>({ ...printSettings });
  const [localCurrency, setLocalCurrency] = useState(currency);
  const [isSearchingHardware, setIsSearchingHardware] = useState<'bluetooth' | 'serial' | null>(null);
  const [hardwareError, setHardwareError] = useState<string | null>(null);
  
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypePrice, setNewTypePrice] = useState('');

  const handleAddTariff = () => {
    if (newTypeName.trim() && newTypePrice) {
      setLocalTariffs(prev => ({ ...prev, [newTypeName.trim()]: parseInt(newTypePrice) }));
      setNewTypeName(''); setNewTypePrice('');
    }
  };

  const handleEditTariff = (type: string, price: number) => {
    setNewTypeName(type);
    setNewTypePrice(price.toString());
    document.getElementById('new-tariff-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleRemoveTariff = (type: string) => {
    const next = { ...localTariffs };
    delete next[type];
    setLocalTariffs(next);
  };

  const handleSaveAll = () => {
    onSaveAllSettings(localTariffs, localPrint, localCurrency);
    onClose();
  };

  const handleScanBluetooth = async () => {
    setHardwareError(null);
    setIsSearchingHardware('bluetooth');
    try {
      const nav = navigator as any;
      if (!nav.bluetooth) {
        throw new Error("Su navegador no soporta Bluetooth Web. Intente usar Chrome o Edge en Android/Desktop.");
      }

      // 1. Escanear filtrando por servicio de impresora estándar (0x18f0)
      console.log("Iniciando escaneo de dispositivos Bluetooth...");
      const device = await nav.bluetooth.requestDevice({
        filters: [
          { services: ['000018f0-0000-1000-8000-00805f9b34fb'] } // Servicio estándar de impresoras térmicas
        ],
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
      });

      if (!device) throw new Error("No se seleccionó ningún dispositivo.");

      console.log("Dispositivo seleccionado:", device.name);

      // 2. Intentar conexión de prueba
      if (device.gatt) {
        const server = await device.gatt.connect();
        console.log("Servidor GATT conectado");
        
        const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
        const characteristics = await service.getCharacteristics();
        
        // Buscar característica de escritura
        const writer = characteristics.find((c: any) => c.properties.write || c.properties.writeWithoutResponse);
        
        if (!writer) {
          device.gatt.disconnect();
          throw new Error("El dispositivo no tiene capacidad de escritura (no parece una impresora).");
        }

        console.log("Impresora validada correctamente.");
        
        // 3. Guardar dispositivo validado
        const hardware: PrinterHardware = { 
          type: 'bluetooth', 
          name: device.name || 'Impresora BT', 
          connected: true, 
          device: device 
        };
        
        setLocalPrint(prev => ({ ...prev, hardware }));
        
        // Desconectamos para liberar el recurso
        device.gatt.disconnect();
      } else {
        throw new Error("El dispositivo no soporta GATT.");
      }

    } catch (e: any) { 
      console.error("Error Bluetooth:", e);
      let msg = e.message;
      if (e.name === 'NotFoundError') msg = "Usuario canceló la búsqueda.";
      
      // Detectar errores de políticas de seguridad / iframe
      if (e.name === 'SecurityError' || (e.message && e.message.includes("permissions policy"))) {
        msg = "Bloqueado por el entorno: Bluetooth requiere abrir la App en una ventana propia.";
      }
      
      setHardwareError(msg); 
    } finally { 
      setIsSearchingHardware(null); 
    }
  };

  const handleScanSerial = async () => {
    setHardwareError(null);
    setIsSearchingHardware('serial');
    try {
      if (!(navigator as any).serial) throw new Error("API Serial no soportada en este navegador.");
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate: 9600 });
      const hardware: PrinterHardware = { type: 'serial', name: 'USB Printer', connected: true, device: port };
      setLocalPrint(prev => ({ ...prev, hardware }));
    } catch (e: any) { 
      let msg = e.message;
      if (e.name === 'NotFoundError') msg = "Usuario canceló la selección.";
      setHardwareError(msg); 
    } finally { 
      setIsSearchingHardware(null); 
    }
  };

  const currentCurrencySymbol = CURRENCY_OPTIONS.find(c => c.code === localCurrency)?.symbol || '$';

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="bg-slate-50 border-b border-slate-200">
          <div className="p-6 pb-0 flex justify-between items-center">
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Ajustes</h3>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded-lg transition-all"><X size={20} /></button>
          </div>
          <div className="flex px-6 mt-4 overflow-x-auto no-scrollbar">
            {[
              { id: 'cloud', label: 'Nube', icon: <Link size={14} /> },
              { id: 'tariffs', label: 'Precios', icon: <Wallet size={14} /> },
              { id: 'printer', label: 'Ticket', icon: <Printer size={14} /> },
              { id: 'history', label: 'Historial', icon: <History size={14} /> },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-4 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all flex items-center gap-2 ${activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400'}`}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'cloud' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex gap-4">
                <Link size={20} className="text-blue-600" />
                <p className="text-xs text-blue-700 font-medium">Conecte su Google Sheets para que los registros y precios se guarden en la nube.</p>
              </div>
              <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="URL de Apps Script..." className="w-full border border-slate-200 rounded-xl px-4 py-3 text-xs font-mono bg-slate-50" />
              <button onClick={() => onConnect(url)} className="bg-blue-600 text-white w-full py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 shadow-lg">Vincular y Sincronizar</button>
            </div>
          )}

          {activeTab === 'tariffs' && (
            <div className="space-y-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">Moneda Local</label>
                <select value={localCurrency} onChange={(e) => setLocalCurrency(e.target.value)} className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm font-bold">
                  {CURRENCY_OPTIONS.map(opt => <option key={opt.code} value={opt.code}>{opt.code} - {opt.label}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                {(Object.entries(localTariffs) as [string, number][]).map(([type, price]) => (
                  <div key={type} className="flex items-center gap-3 bg-white p-3 border border-slate-100 rounded-xl shadow-sm">
                    <span className="flex-1 text-xs font-black text-slate-800">{type}</span>
                    <span className="font-mono font-bold text-sm text-blue-600">{currentCurrencySymbol} {price}</span>
                    <button onClick={() => handleEditTariff(type, price)} className="p-2 text-slate-300 hover:text-blue-600 transition-all"><Edit2 size={16} /></button>
                    <button onClick={() => handleRemoveTariff(type)} className="p-2 text-slate-300 hover:text-red-500 transition-all"><Trash2 size={16} /></button>
                  </div>
                ))}
                <div id="new-tariff-form" className="bg-blue-50/50 p-4 rounded-xl border border-dashed border-blue-200 mt-4">
                  <div className="flex gap-2">
                    <input type="text" placeholder="Tipo" value={newTypeName} onChange={(e) => setNewTypeName(e.target.value)} className="flex-1 px-3 py-2 border rounded-lg text-xs font-bold" />
                    <input type="number" placeholder="$/H" value={newTypePrice} onChange={(e) => setNewTypePrice(e.target.value)} className="w-20 px-3 py-2 border rounded-lg text-xs font-bold" />
                    <button onClick={handleAddTariff} className="bg-blue-600 text-white p-2 rounded-lg"><Plus size={20} /></button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'printer' && (
            <div className="space-y-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h4 className="text-xs font-black uppercase mb-4 flex gap-2"><Cpu size={16} className="text-blue-500" /> Hardware de Impresión</h4>
                
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={handleScanBluetooth} 
                    disabled={isSearchingHardware === 'bluetooth'}
                    className={`flex flex-col items-center gap-3 p-4 bg-white border-2 rounded-2xl transition-all relative overflow-hidden ${isSearchingHardware === 'bluetooth' ? 'border-blue-400 bg-blue-50' : 'border-slate-100 hover:border-blue-500 hover:shadow-md'}`}
                  >
                    {isSearchingHardware === 'bluetooth' ? (
                      <Loader2 size={24} className="text-blue-600 animate-spin" />
                    ) : (
                      <Bluetooth size={24} className="text-blue-600" />
                    )}
                    <span className="text-[10px] font-black uppercase tracking-tight text-center">
                      {isSearchingHardware === 'bluetooth' ? 'Escaneando...' : 'Escanear Bluetooth'}
                    </span>
                    {isSearchingHardware === 'bluetooth' && (
                      <div className="absolute inset-x-0 bottom-0 h-1 bg-blue-200 overflow-hidden">
                        <div className="h-full bg-blue-600 animate-progress"></div>
                      </div>
                    )}
                  </button>

                  <button 
                    onClick={handleScanSerial} 
                    disabled={isSearchingHardware === 'serial'}
                    className="flex flex-col items-center gap-3 p-4 bg-white border-2 border-slate-100 rounded-2xl hover:border-slate-500 hover:shadow-md transition-all"
                  >
                    <Usb size={24} className="text-slate-600" />
                    <span className="text-[10px] font-black uppercase tracking-tight text-center">Conectar USB</span>
                  </button>
                </div>

                {hardwareError && (
                  <div className="mt-3 p-3 bg-red-50 text-red-600 text-[10px] font-bold rounded-xl flex flex-col gap-2 border border-red-100 animate-in slide-in-from-top-1">
                    <div className="flex items-start gap-2">
                       <AlertCircle size={14} className="shrink-0 mt-0.5" />
                       <span className="flex-1">{hardwareError}</span>
                    </div>
                    {/* Botón explícito para salir del iframe/entorno restringido */}
                    {(hardwareError.includes("Bloqueado") || hardwareError.includes("entorno")) && (
                       <button 
                         onClick={() => window.open(window.location.href, '_blank')} 
                         className="mt-1 w-full py-2.5 bg-white border border-red-200 rounded-lg text-red-600 hover:bg-red-50 text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
                       >
                          <ExternalLink size={14} /> Abrir App en Ventana Externa
                       </button>
                    )}
                  </div>
                )}

                {localPrint.hardware?.connected && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-100 rounded-xl flex justify-between items-center animate-in zoom-in duration-200">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 text-green-700 rounded-full">
                        <PrinterCheck size={18} />
                      </div>
                      <div>
                        <div className="text-xs font-black text-green-800 uppercase">{localPrint.hardware.name}</div>
                        <div className="text-[10px] text-green-600 font-bold">Conectado y Listo</div>
                      </div>
                    </div>
                    <button 
                      onClick={() => setLocalPrint(p => ({ ...p, hardware: DEFAULT_PRINT_SETTINGS.hardware }))} 
                      className="text-[10px] font-bold text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Desconectar
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">Nombre del Negocio</label>
                  <input type="text" value={localPrint.businessName} onChange={(e) => setLocalPrint(p => ({ ...p, businessName: e.target.value }))} placeholder="Nombre Empresa" className="w-full px-4 py-2 border rounded-lg text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="flex items-center justify-between p-3 bg-white border rounded-lg">
                  <span className="text-xs font-bold text-slate-700">Impresión Automática al Ingreso</span>
                  <button onClick={() => setLocalPrint(p => ({ ...p, autoPrintEntry: !p.autoPrintEntry }))} className={`w-10 h-5 rounded-full relative transition-colors ${localPrint.autoPrintEntry ? 'bg-blue-600' : 'bg-slate-200'}`}>
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${localPrint.autoPrintEntry ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-3">
              {printHistory.map(item => (
                <div key={item.id} className="bg-white border border-slate-100 p-3 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-sm font-black font-mono">{item.placa}</span>
                    <p className="text-[10px] text-slate-400">{new Date(item.timestamp).toLocaleString()}</p>
                  </div>
                  <button onClick={() => onReprint(item.id)} className="p-2 bg-slate-50 rounded-lg hover:bg-blue-600 hover:text-white transition-all"><PrinterCheck size={16} /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        {(activeTab === 'tariffs' || activeTab === 'printer') && (
          <div className="p-6 border-t border-slate-100">
            <button onClick={handleSaveAll} className="w-full bg-slate-900 text-white py-4 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl">Guardar Todo en la Nube</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SheetConnectionModal;
