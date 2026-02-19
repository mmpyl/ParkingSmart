
import React from 'react';
import { SheetRow, PrintSettings, formatCurrency, calculateParkingStats, Tariffs } from '../types';

interface TicketTemplateProps {
  row: SheetRow;
  settings: PrintSettings;
  tariffs: Tariffs;
  currency?: string;
}

const TicketTemplate: React.FC<TicketTemplateProps> = ({ row, settings, tariffs, currency = 'COP' }) => {
  const stats = calculateParkingStats(row.Entrada, row.Tipo, tariffs, row.Salida !== '-' ? new Date(row.Salida) : undefined);
  const isExit = row.Estado === 'Finalizado';

  return (
    <div style={{ 
      width: settings.paperWidth === '58mm' ? '180px' : '280px', 
      padding: '10px', 
      fontSize: '12px', 
      lineHeight: '1.2',
      color: 'black',
      backgroundColor: 'white',
      fontFamily: 'monospace'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '10px' }}>
        <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '2px' }}>{settings.businessName}</div>
        <div style={{ fontSize: '10px' }}>NIT: {settings.nit}</div>
        <div style={{ fontSize: '10px' }}>{settings.address}</div>
        <div style={{ fontSize: '10px' }}>Tel: {settings.phone}</div>
      </div>

      <div style={{ borderTop: '1px dashed black', paddingTop: '8px', marginBottom: '8px' }}>
        <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '5px' }}>
          TICKET DE {isExit ? 'SALIDA' : 'INGRESO'}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>PLACA:</span>
          <span style={{ fontWeight: 'bold' }}>{row.Placa}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>VEHICULO:</span>
          <span style={{ maxWidth: '120px', textAlign: 'right', display: 'inline-block' }}>{row.Vehiculo}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>TIPO:</span>
          <span>{row.Tipo}</span>
        </div>
      </div>

      <div style={{ borderTop: '1px dashed black', paddingTop: '8px', marginBottom: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>ENTRADA:</span>
          <span>{stats.entryFormatted}</span>
        </div>
        {isExit && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>SALIDA:</span>
              <span>{stats.exitFormatted}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>TIEMPO:</span>
              <span>{stats.durationText}</span>
            </div>
          </>
        )}
      </div>

      {isExit && (
        <div style={{ borderTop: '1px solid black', paddingTop: '8px', marginBottom: '10px', textAlign: 'center' }}>
          <div style={{ fontSize: '10px' }}>VALOR HORA: {formatCurrency(tariffs[row.Tipo] || tariffs['Default'] || 0, currency)}</div>
          <div style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '4px' }}>
            TOTAL: {formatCurrency(row.Total, currency)}
          </div>
        </div>
      )}

      {!isExit && (
        <div style={{ textAlign: 'center', margin: '15px 0' }}>
          <div style={{ border: '1px solid black', padding: '10px', display: 'inline-block' }}>
            ESPACIO PARA SELLO
          </div>
        </div>
      )}

      <div style={{ borderTop: '1px dashed black', paddingTop: '8px', fontSize: '9px', textAlign: 'center', fontStyle: 'italic' }}>
        {settings.footerMessage}
        <div style={{ marginTop: '5px', fontSize: '8px' }}>Powered by ParkMaster AI</div>
      </div>
    </div>
  );
};

export default TicketTemplate;
