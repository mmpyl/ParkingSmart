import React from 'react';
import { SheetRow, PrintSettings, BillingUnit, formatCurrency, calculateParkingStats, Tariffs } from '../types';

interface TicketTemplateProps {
  row: SheetRow;
  settings: PrintSettings;
  tariffs: Tariffs;
  currency?: string;
  billingUnit?: BillingUnit;
}

const SIZE_MULTIPLIER: Record<PrintSettings['textSize'], number> = {
  compact: 0.88,
  normal: 1,
  large: 1.12
};

const TicketTemplate: React.FC<TicketTemplateProps> = ({ row, settings, tariffs, currency = 'COP', billingUnit = 'hour' }) => {
  const stats = calculateParkingStats(row.Entrada, row.Tipo, tariffs, row.Salida !== '-' ? new Date(row.Salida) : undefined, billingUnit);
  const isExit = row.Estado === 'Finalizado';
  const rate = tariffs[row.Tipo] || tariffs.Default || 0;
  const dateLabel = new Date(row.Entrada).toLocaleDateString('es-CO');
  const title = settings.ticketTitle?.trim() || 'COMPROBANTE DE PARQUEO';
  const textSize = settings.textSize || 'normal';
  const mult = SIZE_MULTIPLIER[textSize];
  const is58 = settings.paperWidth === '58mm';

  const baseFont = Math.max(9, Math.round((is58 ? 10.5 : 12) * mult * 10) / 10);
  const heroFont = Math.max(24, Math.round((is58 ? 30 : 36) * mult));
  const paidFont = Math.max(18, Math.round((is58 ? 22 : 26) * mult));
  const ticketWidth = is58 ? '58mm' : '80mm';

  const qrPayload = [
    `Placa:${row.Placa}`,
    `Tipo:${row.Tipo}`,
    `Entrada:${row.Entrada}`,
    isExit ? `Salida:${row.Salida}` : null,
    isExit ? `Total:${row.Total}` : null
  ].filter(Boolean).join(' | ');

  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&format=svg&ecc=M&qzone=1&data=${encodeURIComponent(qrPayload)}`;


  const barcodeSeed = String(row.Placa || '').toUpperCase().replace(/[^A-Z0-9]/g, '') || '000000';
  const bars = Array.from(barcodeSeed).flatMap((char, idx) => {
    const code = char.charCodeAt(0);
    const widths = [(code % 3) + 1, ((code >> 2) % 3) + 1, ((code >> 4) % 3) + 1];
    return widths.map((w, i) => ({ key: `${idx}-${i}`, width: w }));
  });

  const separatorStyle: React.CSSProperties = {
    borderTop: '1px dashed #111827',
    margin: '6px 0',
    paddingTop: '6px'
  };

  return (
    <article
      data-ticket-width={settings.paperWidth}
      style={{
        width: ticketWidth,
        maxWidth: '100%',
        boxSizing: 'border-box',
        padding: is58 ? '8px 6px 10px' : '10px 8px 12px',
        color: '#111827',
        backgroundColor: 'white',
        fontFamily: '"JetBrains Mono", "Courier New", monospace',
        fontSize: `${baseFont}px`,
        lineHeight: 1.22,
        letterSpacing: '0.01em',
        border: '1px solid #e5e7eb',
        wordBreak: 'break-word',
        overflowWrap: 'anywhere'
      }}
    >
      {settings.showBusinessInfo && (
        <header style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: `${Math.max(12, Math.round(14 * mult))}px`, marginBottom: 2 }}>
            <span>⬆</span>
            <span style={{ fontSize: `${Math.max(15, Math.round(16 * mult))}px` }}>🚗</span>
            <span>⬆</span>
          </div>
          <div style={{ fontWeight: 700, fontSize: `${Math.max(10, Math.round((is58 ? 11 : 12) * mult * 10) / 10)}px` }}>{settings.businessName}</div>
          <div>{settings.address}</div>
        </header>
      )}

      <section style={separatorStyle}>
        <div style={{ textAlign: 'center', letterSpacing: '0.08em', fontWeight: 700 }}>{title}</div>
      </section>

      {settings.showVehicleDetails && (
        <section style={{ ...separatorStyle, marginTop: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 6, rowGap: 2 }}>
            <strong>Placa:</strong><span>{String(row.Placa).toUpperCase()}</span>
          </div>
        </section>
      )}

      {!isExit ? (
        <section style={{ textAlign: 'center' }}>
          <div style={{ fontSize: `${heroFont}px`, lineHeight: 1, marginTop: 4, fontWeight: 700 }}>{String(row.Placa).toUpperCase()}</div>
          <div style={{ marginTop: 4 }}>Fecha: {dateLabel}</div>
          <div style={separatorStyle}>
            <div style={{ fontSize: `${paidFont}px`, fontWeight: 400 }}>Total: {formatCurrency(0, currency)}</div>
          </div>
        </section>
      ) : (
        <section>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 6, rowGap: 2 }}>
            <strong>Fecha:</strong><span>{dateLabel}</span>
            <strong>Entrada:</strong><span>{stats.entryFormatted || '-'}</span>
            <strong>Salida:</strong><span>{stats.exitFormatted || '-'}</span>
            <strong>Tiempo:</strong><span>{stats.durationText}</span>
            {settings.showRateBreakdown && (<><strong>Tarifa:</strong><span>{formatCurrency(rate, currency)} / {billingUnit === 'day' ? 'día' : 'hora'}</span></>)}
          </div>
          <div style={{ ...separatorStyle, textAlign: 'center' }}>
            <div style={{ fontSize: `${paidFont}px`, fontWeight: 400 }}>Total: {formatCurrency(row.Total, currency)}</div>
          </div>
        </section>
      )}

      {settings.showBarcodeOnTicket && (
        <section style={{ ...separatorStyle, textAlign: 'center' }}>
          <div
            aria-label="barcode"
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'stretch',
              gap: 1,
              height: is58 ? '40px' : '46px',
              marginBottom: '4px',
              overflow: 'hidden'
            }}
          >
            {bars.map((bar) => (
              <span
                key={bar.key}
                style={{
                  width: `${Math.max(1, bar.width)}px`,
                  background: '#111827',
                  display: 'inline-block'
                }}
              />
            ))}
          </div>
          <div style={{ fontSize: `${Math.max(8, Math.round(baseFont - 1))}px`, letterSpacing: '0.12em' }}>{String(row.Placa).toUpperCase()}</div>
        </section>
      )}

      {settings.showQrOnTicket && (
        <section style={{ textAlign: 'center', marginBottom: 6 }}>
          <img src={qrSrc} alt="Código QR del ticket" style={{ width: is58 ? '70px' : '86px', height: is58 ? '70px' : '86px', margin: '0 auto', imageRendering: 'crisp-edges' }} />
        </section>
      )}

      <footer style={{ textAlign: 'center' }}>
        {settings.showThankYouMessage && <div style={{ fontWeight: 700 }}>¡GRACIAS POR SU VISITA!</div>}
        <div style={{ marginTop: 4, fontSize: `${Math.max(8, Math.round(baseFont - 1))}px` }}>{settings.footerMessage}</div>
        {settings.showContactInfo && (
          <div style={{ marginTop: 2, fontSize: `${Math.max(8, Math.round(baseFont - 1))}px` }}>
            NIT: {settings.nit} · Tel: {settings.phone}
          </div>
        )}
      </footer>
    </article>
  );
};

export default TicketTemplate;
