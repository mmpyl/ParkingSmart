# ParkingSmart

Sistema de gestión de parqueadero con:

- registro rápido de ingresos/salidas
- historial editable
- impresión de tickets (con QR opcional)
- configuración de tarifas por tipo y unidad de cobro (`hour` / `day`)
- sincronización con Google Apps Script / Google Sheets
- dashboard operativo y analítico

## Requisitos

- Node.js 20+
- npm

## Desarrollo local

1. Instalar dependencias:
   ```bash
   npm install
   ```
2. Ejecutar en modo desarrollo:
   ```bash
   npm run dev
   ```

## Scripts

```bash
npm run dev           # entorno local con Vite
npm run build         # build de producción
npm run preview       # previsualizar build
npm run typecheck     # verificación TypeScript
npm run test          # pruebas Vitest
npm run test:typecheck
```

## Estructura principal

- `features/app`: shell y composición principal
- `features/parking`: estado y acciones de parqueo
- `features/cloud-sync`: lectura/escritura en Apps Script
- `features/printing`: flujo de impresión e historial
- `features/shared`: utilidades comunes (localStorage, etc.)
- `components`: componentes UI reutilizables
- `tests`: pruebas unitarias/integración

## Notas

- El contenedor de impresión usa `#ticket-print-container` en `index.html`.
- La sincronización requiere URL válida de despliegue de Google Apps Script.
