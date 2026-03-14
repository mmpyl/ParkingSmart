import React from 'react';
import { SheetRow, PrintSettings, BillingUnit, formatCurrency, calculateParkingStats, Tariffs } from '../types';

interface TicketTemplateProps {
  row: SheetRow;
  settings: PrintSettings;
  tariffs: Tariffs;
  currency?: string;
  billingUnit?: BillingUnit;
}

const separatorStyle: React.CSSProperties = {
  borderTop: '1px dashed #111827',
  margin: '8px 0',
  paddingTop: '8px'
};

const TicketTemplate: React.FC<TicketTemplateProps> = ({ row, settings, tariffs, currency = 'COP', billingUnit = 'hour' }) => {
  const stats = calculateParkingStats(row.Entrada, row.Tipo, tariffs, row.Salida !== '-' ? new Date(row.Salida) : undefined, billingUnit);
  const isExit = row.Estado === 'Finalizado';
  const widthPx = settings.paperWidth === '58mm' ? 210 : 290;
  const rate = tariffs[row.Tipo] || tariffs.Default || 0;
  const dateLabel = new Date(row.Entrada).toLocaleDateString('es-CO');

  const qrPayload = [
    `Placa:${row.Placa}`,
    `Tipo:${row.Tipo}`,
    `Entrada:${row.Entrada}`,
    isExit ? `Salida:${row.Salida}` : null,
    isExit ? `Total:${row.Total}` : null
  ]
    .filter(Boolean)
    .join(' | ');

  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(qrPayload)}`;

  return (
    <article
      data-ticket-width={settings.paperWidth}
      style={{
        width: `${widthPx}px`,
        maxWidth: '100%',
        padding: '12px 10px 14px',
        color: '#111827',
        backgroundColor: 'white',
        fontFamily: '"JetBrains Mono", "Courier New", monospace',
        fontSize: settings.paperWidth === '58mm' ? '11px' : '12px',
        lineHeight: 1.3,
        letterSpacing: '0.02em',
        border: '1px solid #e5e7eb'
      }}
    >
      <header style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', marginBottom: 4 }}>
          <span>⬆</span>
          <span style={{ fontSize: '20px' }}>🚗</span>
          <span>⬆</span>
        </div>
        <div style={{ fontWeight: 700, fontSize: '13px' }}>{settings.businessName}</div>
        <div>{settings.address}</div>
      </header>

      <section style={separatorStyle}>
        <div style={{ textAlign: 'center', letterSpacing: '0.1em', fontWeight: 700 }}>PARKING RECEIPT</div>
      </section>

      {!isExit ? (
        <section style={{ textAlign: 'center' }}>
          <div style={{ fontSize: settings.paperWidth === '58mm' ? '36px' : '42px', lineHeight: 1, marginTop: 8 }}>{new Date(row.Entrada).toLocaleTimeString('es-CO')}</div>
          <div style={{ marginTop: 6 }}>{dateLabel}</div>
          <div style={{ marginTop: 4 }}>Space: {row.id}</div>
          <div style={separatorStyle}>
            <div style={{ fontSize: settings.paperWidth === '58mm' ? '26px' : '30px', fontWeight: 700 }}>
              Paid: {formatCurrency(0, currency)}
            </div>
          </div>
        </section>
      ) : (
        <section>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 8, rowGap: 4 }}>
            <strong>DATE:</strong>
            <span>{dateLabel}</span>
            <strong>FROM:</strong>
            <span>{stats.entryFormatted || '-'}</span>
            <strong>TO:</strong>
            <span>{stats.exitFormatted || '-'}</span>
            <strong>TYPE:</strong>
            <span>{row.Tipo}</span>
            <strong>RATE:</strong>
            <span>{formatCurrency(rate, currency)} / {billingUnit === 'day' ? 'día' : 'hora'}</span>
          </div>
          <div style={{ ...separatorStyle, textAlign: 'center' }}>
            <div style={{ fontSize: settings.paperWidth === '58mm' ? '26px' : '30px', fontWeight: 700 }}>
              Paid: {formatCurrency(row.Total, currency)}
            </div>
          </div>
        </section>
      )}

      <section style={{ ...separatorStyle, textAlign: 'center' }}>
        <div
          aria-label="barcode"
          style={{
            height: '44px',
            marginBottom: '6px',
            backgroundImage:
              'repeating-linear-gradient(90deg, #111827 0, #111827 2px, transparent 2px, transparent 4px, #111827 4px, #111827 5px, transparent 5px, transparent 7px)',
            backgroundSize: '100% 100%'
          }}
        />
        <div style={{ fontSize: '10px' }}>{row.Placa}</div>
      </section>

      {settings.showQrOnTicket && (
        <section style={{ textAlign: 'center', marginBottom: 8 }}>
          <img src={qrSrc} alt="Código QR del ticket" style={{ width: '72px', height: '72px', margin: '0 auto' }} />
        </section>
      )}

      <footer style={{ textAlign: 'center' }}>
        <div style={{ fontWeight: 700 }}>THANK YOU AND DRIVE SAFELY!</div>
        <div style={{ marginTop: 6, fontSize: '10px' }}>{settings.footerMessage}</div>
        <div style={{ marginTop: 4, fontSize: '10px' }}>NIT: {settings.nit} · Tel: {settings.phone}</div>
      </footer>
    </article>
  );
};

export default TicketTemplate;
