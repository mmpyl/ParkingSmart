import React, { useState, useEffect, useMemo, useRef } from 'react';
import { SheetRow, Tariffs, BillingUnit, calculateParkingStats, formatCurrency } from '../types';
import { LogOut, Clock, Car, Bike, Truck, Timer, Printer, Search, Camera, X } from 'lucide-react';

interface ActiveVehiclesGridProps {
  data: SheetRow[];
  onRegisterExit: (id: string) => void;
  onPrintTicket: (row: SheetRow) => void;
  tariffs: Tariffs;
  currency?: string;
  billingUnit?: BillingUnit;
}

const extractPlateFromText = (rawText: string) => {
  const clean = rawText.toUpperCase().replace(/[^A-Z0-9]/g, ' ');
  const chunks = clean.split(/\s+/).filter(Boolean);
  const patterns = [/^[A-Z]{3}[0-9]{3}$/, /^[A-Z]{3}[0-9]{2}[A-Z]$/, /^[A-Z]{2}[0-9]{3}[A-Z]{2}$/];

  for (const token of chunks) {
    if (patterns.some((p) => p.test(token))) return token;
  }

  const joined = clean.replace(/\s+/g, '');
  for (let i = 0; i < joined.length; i += 1) {
    for (let len = 6; len <= 7; len += 1) {
      const token = joined.slice(i, i + len);
      if (patterns.some((p) => p.test(token))) return token;
    }
  }

  return '';
};

const ActiveVehiclesGrid: React.FC<ActiveVehiclesGridProps> = ({ data, onRegisterExit, onPrintTicket, tariffs, currency = 'COP', billingUnit = 'hour' as BillingUnit }) => {
  const activeVehicles = data.filter(v => v.Estado === 'Activo');
  const [tick, setTick] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

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

  const openCamera = async () => {
    setScanError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false
      });
      streamRef.current = stream;
      setIsCameraOpen(true);
      requestAnimationFrame(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      });
    } catch {
      setScanError('No se pudo abrir la cámara. Revisa permisos del navegador.');
    }
  };

  const closeCamera = () => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    setIsCameraOpen(false);
    setIsScanning(false);
  };

  const scanPlate = async () => {
    if (!videoRef.current) return;
    setScanError(null);
    setIsScanning(true);

    try {
      const width = videoRef.current.videoWidth || 1280;
      const height = videoRef.current.videoHeight || 720;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No se pudo procesar imagen');
      ctx.drawImage(videoRef.current, 0, 0, width, height);

      const Detector = (window as any).TextDetector;
      if (!Detector) {
        throw new Error('OCR no soportado por este navegador. Usa Chrome Android actualizado.');
      }

      const detector = new Detector();
      const blocks = await detector.detect(canvas);
      const text = blocks.map((b: any) => b.rawValue || b.text || '').join(' ');
      const plate = extractPlateFromText(text);
      if (!plate) throw new Error('No se detectó una placa válida. Intenta de nuevo con mejor iluminación.');

      setSearchTerm(plate);
      closeCamera();
    } catch (error: any) {
      setScanError(error?.message || 'No se pudo reconocer la placa.');
    } finally {
      setIsScanning(false);
    }
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
        <div className="w-full md:w-96 flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por placa, modelo o tipo"
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <button
            type="button"
            onClick={openCamera}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
            title="Escanear placa con cámara"
          >
            <Camera size={15} />
          </button>
        </div>
      </div>

      {scanError && <p className="text-[11px] font-bold text-red-500 mb-3">{scanError}</p>}

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

      {isCameraOpen && (
        <div className="fixed inset-0 z-[120] bg-slate-900/85 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="w-full max-w-md bg-white rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h4 className="text-sm font-black uppercase tracking-widest text-slate-700">Escanear Placa para Buscar</h4>
              <button onClick={closeCamera} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
            </div>
            <div className="p-4 space-y-3">
              <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-xl bg-black aspect-video object-cover" />
              <p className="text-[11px] text-slate-500 font-semibold">Enfoca la placa para ubicar rápido el vehículo y registrar salida.</p>
              <div className="flex gap-2">
                <button type="button" onClick={closeCamera} className="flex-1 py-2 rounded-lg border border-slate-200 text-slate-600 text-xs font-black uppercase">Cancelar</button>
                <button type="button" onClick={scanPlate} disabled={isScanning} className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-xs font-black uppercase disabled:bg-slate-300">
                  {isScanning ? 'Reconociendo...' : 'Reconocer placa'}
                </button>
              </div>
              {scanError && <p className="text-[11px] text-red-500 font-bold">{scanError}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActiveVehiclesGrid;
