
import { SheetRow, PrintSettings, Tariffs, calculateParkingStats, formatCurrency } from '../types';

// Comandos ESC/POS básicos
const ESC = '\x1B';
const GS = '\x1D';
const LF = '\x0A'; // Line Feed

const CMDS = {
  INIT: ESC + '@',
  ALIGN_LEFT: ESC + 'a' + '\x00',
  ALIGN_CENTER: ESC + 'a' + '\x01',
  ALIGN_RIGHT: ESC + 'a' + '\x02',
  BOLD_ON: ESC + 'E' + '\x01',
  BOLD_OFF: ESC + 'E' + '\x00',
  TEXT_NORMAL: GS + '!' + '\x00',
  TEXT_DOUBLE_HEIGHT: GS + '!' + '\x10',
  TEXT_DOUBLE_WIDTH: GS + '!' + '\x20',
  TEXT_BIG: GS + '!' + '\x30',
  CUT: GS + 'V' + '\x41' + '\x03' // Corte parcial
};

// UUID Estándar para Impresoras Térmicas
const PRINTER_SERVICE_UUID = '000018f0-0000-1000-8000-00805f9b34fb';

// Elimina acentos para evitar caracteres raros en impresoras térmicas básicas
const sanitize = (str: string): string => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

const encoder = new TextEncoder();

export const generateEscPosTicket = (
  row: SheetRow,
  settings: PrintSettings,
  tariffs: Tariffs,
  currency: string
): Uint8Array => {
  let commands = '';
  const stats = calculateParkingStats(row.Entrada, row.Tipo, tariffs, row.Salida !== '-' ? new Date(row.Salida) : undefined);
  const isExit = row.Estado === 'Finalizado';
  
  // 1. Inicializar
  commands += CMDS.INIT;
  
  // 2. Cabecera
  commands += CMDS.ALIGN_CENTER;
  commands += CMDS.BOLD_ON;
  commands += sanitize(settings.businessName) + LF;
  commands += CMDS.BOLD_OFF;
  commands += `NIT: ${sanitize(settings.nit)}` + LF;
  commands += sanitize(settings.address) + LF;
  commands += `Tel: ${sanitize(settings.phone)}` + LF;
  commands += '--------------------------------' + LF;

  // 3. Título
  commands += CMDS.BOLD_ON;
  commands += CMDS.TEXT_DOUBLE_HEIGHT;
  commands += (isExit ? 'TICKET DE SALIDA' : 'TICKET DE INGRESO') + LF;
  commands += CMDS.TEXT_NORMAL;
  commands += CMDS.BOLD_OFF;
  commands += LF;

  // 4. Detalles del Vehículo
  commands += CMDS.ALIGN_LEFT;
  commands += `PLACA:    ${CMDS.BOLD_ON}${sanitize(row.Placa)}${CMDS.BOLD_OFF}` + LF;
  commands += `VEHICULO: ${sanitize(String(row.Vehiculo)).substring(0, 20)}` + LF;
  commands += `TIPO:     ${sanitize(row.Tipo)}` + LF;
  commands += '--------------------------------' + LF;

  // 5. Tiempos
  commands += `ENTRADA: ${stats.entryFormatted}` + LF;
  if (isExit) {
    commands += `SALIDA:  ${stats.exitFormatted}` + LF;
    commands += `TIEMPO:  ${sanitize(stats.durationText)}` + LF;
    commands += '--------------------------------' + LF;
    
    // 6. Total (Solo si es salida)
    commands += CMDS.ALIGN_CENTER;
    commands += CMDS.TEXT_BIG;
    commands += `TOTAL: ${formatCurrency(row.Total, currency)}` + LF;
    commands += CMDS.TEXT_NORMAL;
  } else {
    commands += LF + LF + '___________________________' + LF;
    commands += CMDS.ALIGN_CENTER;
    commands += 'ESPACIO PARA SELLO' + LF;
  }

  // 7. Pie de página
  commands += LF;
  commands += CMDS.ALIGN_CENTER;
  commands += sanitize(settings.footerMessage) + LF;
  commands += LF + LF + LF; // Espacio para cortar
  commands += CMDS.CUT;

  return encoder.encode(commands);
};

export const printToHardware = async (
  row: SheetRow,
  settings: PrintSettings,
  tariffs: Tariffs,
  currency: string
): Promise<{ success: boolean; error?: string }> => {
  
  if (!settings.hardware?.device) {
    return { success: false, error: "Dispositivo no conectado en memoria. Reconecte en Ajustes." };
  }

  try {
    const data = generateEscPosTicket(row, settings, tariffs, currency);
    const hw = settings.hardware;

    if (hw.type === 'bluetooth') {
      const device = hw.device as any;
      let server = device.gatt;

      // 1. Asegurar Conexión
      if (!server.connected) {
         try {
           server = await device.gatt.connect();
         } catch (connErr) {
           return { success: false, error: "No se pudo reconectar con la impresora. Verifique que esté encendida." };
         }
      }

      // 2. Obtener Servicio y Característica
      // Intentamos usar el UUID estándar que usamos en el escaneo
      let characteristic = null;
      try {
        const service = await server.getPrimaryService(PRINTER_SERVICE_UUID);
        const characteristics = await service.getCharacteristics();
        // Buscamos cualquier característica que permita escribir
        characteristic = characteristics.find((c: any) => c.properties.write || c.properties.writeWithoutResponse);
      } catch (serviceErr) {
        // Fallback: Si falla el servicio estándar, buscar en todos los servicios (más lento pero compatible)
        const services = await server.getPrimaryServices();
        for (const s of services) {
          const chars = await s.getCharacteristics();
          const writer = chars.find((c: any) => c.properties.write || c.properties.writeWithoutResponse);
          if (writer) {
            characteristic = writer;
            break;
          }
        }
      }

      if (!characteristic) throw new Error("No se encontró canal de escritura en la impresora.");
      
      // 3. Escribir datos por bloques (Chunking)
      // Bluetooth Low Energy tiene límites de tamaño de paquete (MTU)
      const CHUNK_SIZE = 100; // Valor seguro para la mayoría de impresoras BLE
      for (let i = 0; i < data.length; i += CHUNK_SIZE) {
        const chunk = data.slice(i, i + CHUNK_SIZE);
        await characteristic.writeValue(chunk);
        // Pequeña pausa para evitar saturar el buffer de la impresora
        await new Promise(r => setTimeout(r, 20));
      }
      
      return { success: true };

    } else if (hw.type === 'serial') {
      const port = hw.device as any;
      
      if (!port.writable) {
         if (port.readable === null && port.writable === null) {
            await port.open({ baudRate: 9600 });
         }
      }

      const writer = port.writable.getWriter();
      await writer.write(data);
      writer.releaseLock();
      return { success: true };
    }

    return { success: false, error: "Tipo de hardware desconocido" };
  } catch (e: any) {
    console.error("Error imprimiendo hardware:", e);
    return { success: false, error: e.message || "Error desconocido al imprimir" };
  }
};
