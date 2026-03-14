import { SheetRow, PrintSettings, Tariffs, calculateParkingStats, formatCurrency, BillingUnit } from '../types';

// Comandos ESC/POS básicos
const ESC = '\x1B';
const GS = '\x1D';
const LF = '\x0A';

const CMDS = {
  INIT: ESC + '@',
  ALIGN_LEFT: ESC + 'a' + '\x00',
  ALIGN_CENTER: ESC + 'a' + '\x01',
  BOLD_ON: ESC + 'E' + '\x01',
  BOLD_OFF: ESC + 'E' + '\x00',
  TEXT_NORMAL: GS + '!' + '\x00',
  TEXT_DOUBLE_HEIGHT: GS + '!' + '\x10',
  TEXT_BIG: GS + '!' + '\x30',
  CUT: GS + 'V' + '\x41' + '\x03'
};

const PRINTER_SERVICE_UUID = '000018f0-0000-1000-8000-00805f9b34fb';
const encoder = new TextEncoder();

const sanitize = (str: string): string => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const divider = (paperWidth: PrintSettings['paperWidth']) =>
  paperWidth === '58mm' ? '--------------------------------' : '------------------------------------------------';

export const generateEscPosTicket = (
  row: SheetRow,
  settings: PrintSettings,
  tariffs: Tariffs,
  currency: string,
  billingUnit: BillingUnit = 'hour'
): Uint8Array => {
  const isExit = row.Estado === 'Finalizado';
  const stats = calculateParkingStats(
    row.Entrada,
    row.Tipo,
    tariffs,
    row.Salida !== '-' ? new Date(row.Salida) : undefined,
    billingUnit
  );
  const line = divider(settings.paperWidth);
  const rate = tariffs[row.Tipo] || tariffs.Default || 0;
  const title = settings.ticketTitle?.trim() || 'PARKING RECEIPT';

  let commands = '';
  commands += CMDS.INIT;
  commands += CMDS.ALIGN_CENTER;
  commands += CMDS.BOLD_ON;
  commands += sanitize(settings.businessName) + LF;
  commands += CMDS.BOLD_OFF;
  commands += sanitize(settings.address) + LF;
  commands += line + LF;
  commands += CMDS.BOLD_ON + sanitize(title) + CMDS.BOLD_OFF + LF;
  commands += line + LF;

  commands += CMDS.ALIGN_LEFT;
  if (settings.showVehicleDetails) {
    commands += `PLACA: ${sanitize(row.Placa)}` + LF;
    commands += `TIPO : ${sanitize(row.Tipo)}` + LF;
    commands += `VEHI : ${sanitize(String(row.Vehiculo || '-')).slice(0, 28)}` + LF;
  }
  commands += `FROM : ${sanitize(stats.entryFormatted || '-')}` + LF;

  if (isExit) {
    commands += `TO   : ${sanitize(stats.exitFormatted || '-')}` + LF;
    commands += `TIME : ${sanitize(stats.durationText)}` + LF;
    if (settings.showRateBreakdown) {
      commands += `RATE : ${formatCurrency(rate, currency)} / ${billingUnit === 'day' ? 'dia' : 'hora'}` + LF;
    }
    commands += line + LF;
    commands += CMDS.ALIGN_CENTER;
    if (settings.textSize !== 'compact') commands += CMDS.TEXT_BIG;
    commands += `Paid: ${formatCurrency(row.Total, currency)}` + LF;
    commands += CMDS.TEXT_NORMAL;
  } else {
    commands += line + LF;
    commands += CMDS.ALIGN_CENTER;
    if (settings.textSize !== 'compact') commands += CMDS.TEXT_DOUBLE_HEIGHT;
    commands += `${new Date(row.Entrada).toLocaleTimeString('es-CO')}` + LF;
    commands += CMDS.TEXT_NORMAL;
    commands += `Space: ${row.id}` + LF;
  }

  commands += line + LF;
  if (settings.showBarcodeOnTicket) {
    commands += CMDS.ALIGN_CENTER;
    commands += '|||| ||| |||| ||| |||| ||| ||||' + LF;
    commands += sanitize(row.Placa) + LF;
    commands += line + LF;
  }
  commands += CMDS.ALIGN_CENTER;
  commands += 'THANK YOU AND DRIVE SAFELY!' + LF;
  commands += sanitize(settings.footerMessage).slice(0, 120) + LF;
  commands += `NIT: ${sanitize(settings.nit)}  TEL: ${sanitize(settings.phone)}` + LF;
  commands += LF + LF + LF;
  commands += CMDS.CUT;

  return encoder.encode(commands);
};

export const printToHardware = async (
  row: SheetRow,
  settings: PrintSettings,
  tariffs: Tariffs,
  currency: string,
  billingUnit: BillingUnit = 'hour'
): Promise<{ success: boolean; error?: string }> => {
  if (!settings.hardware?.device) {
    return { success: false, error: 'Dispositivo no conectado en memoria. Reconecte en Ajustes.' };
  }

  try {
    const data = generateEscPosTicket(row, settings, tariffs, currency, billingUnit);
    const hw = settings.hardware;

    if (hw.type === 'bluetooth') {
      const device = hw.device as any;
      let server = device.gatt;

      if (!server.connected) {
        try {
          server = await device.gatt.connect();
        } catch {
          return { success: false, error: 'No se pudo reconectar con la impresora. Verifique que esté encendida.' };
        }
      }

      let characteristic = null;
      try {
        const service = await server.getPrimaryService(PRINTER_SERVICE_UUID);
        const characteristics = await service.getCharacteristics();
        characteristic = characteristics.find((c: any) => c.properties.write || c.properties.writeWithoutResponse);
      } catch {
        const services = await server.getPrimaryServices();
        for (const service of services) {
          const chars = await service.getCharacteristics();
          const writer = chars.find((c: any) => c.properties.write || c.properties.writeWithoutResponse);
          if (writer) {
            characteristic = writer;
            break;
          }
        }
      }

      if (!characteristic) throw new Error('No se encontró canal de escritura en la impresora.');

      const chunkSize = 100;
      for (let i = 0; i < data.length; i += chunkSize) {
        await characteristic.writeValue(data.slice(i, i + chunkSize));
        await new Promise(resolve => setTimeout(resolve, 20));
      }

      return { success: true };
    }

    if (hw.type === 'serial') {
      const port = hw.device as any;
      if (!port.writable && port.readable === null && port.writable === null) {
        await port.open({ baudRate: 9600 });
      }

      const writer = port.writable.getWriter();
      await writer.write(data);
      writer.releaseLock();
      return { success: true };
    }

    return { success: false, error: 'Tipo de hardware desconocido' };
  } catch (error: any) {
    console.error('Error imprimiendo hardware:', error);
    return { success: false, error: error.message || 'Error desconocido al imprimir' };
  }
};
