# Revisión del proyecto (fase 4)

## Estado general

La estructura por features ya está aplicada y funcionando:

- `features/app`: composición principal (`AppShell`) y componentes de layout.
- `features/cloud-sync`: hook y servicio para sincronización con Google Apps Script.
- `features/parking`: estado y mutaciones de negocio del parqueadero.
- `features/printing`: flujo de impresión y reimpresión.
- `features/shared`: servicios transversales de persistencia local.

## Fortalezas observadas

1. **Separación de responsabilidades**
   - `App.tsx` se mantiene como punto de entrada mínimo.
   - La lógica de dominio vive en hooks de feature.

2. **Persistencia centralizada**
   - Uso consistente de `localStorageService` con claves unificadas.

3. **Sincronización más robusta**
   - `saveSheetData` con respuesta tipada y validación de estado.
   - Limpieza de timeout en `useCloudSync`.

4. **Escalabilidad de imports**
   - Cada feature expone `index.ts` como API pública.

## Riesgos / pendientes recomendados

1. **Pruebas automáticas (avance parcial)**
   - Ya existen tests base para utilidades (`calculateParkingStats`, `formatCurrency`) y un test de integración mockeado de sync.
   - Pendiente: ampliar cobertura a hooks y flujos UI críticos.

2. **Módulo IA descontinuado para reducir deuda técnica**
   - Se eliminó el módulo no integrado (`ChatInterface` y `geminiService`) para simplificar mantenimiento.

3. **Contrato del backend Apps Script**
   - Mantener documentado y versionado el formato de respuesta `{ status: 'success' | 'error' }`.

## Plan corto sugerido (siguiente iteración)

1. Mantener `vitest` y ampliar cobertura a hooks (`useCloudSync`, `useParkingActions`, `usePrintManager`).
2. Añadir smoke tests de composición para `AppShell` (render + acciones principales mockeadas).
3. Versionar y validar contrato Apps Script en tests (casos de error/timeout).

## Validación ejecutada

- `npm run typecheck`
- `npm run build`
