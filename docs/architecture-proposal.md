# Propuesta inicial de arquitectura (fase 1)

## Objetivo
Reducir el acoplamiento actual en `App.tsx` y dejar una base mantenible para crecer en:

- sincronización con nube,
- persistencia local,
- impresión,
- y UI de operación diaria.

## Estructura objetivo

```text
src/
  app/
    AppShell.tsx
    providers/
  features/
    parking/
      components/
      hooks/
      services/
      types/
    printing/
      components/
      hooks/
      services/
    cloud-sync/
      hooks/
      services/
  shared/
    components/
    hooks/
    utils/
    types/
```

> Nota: el proyecto actual no usa carpeta `src/`; en una fase posterior se migra sin romper rutas públicas.

## Fases propuestas

### Fase 1 (esta iteración)
1. Documentar plan de refactor y convenciones.
2. Establecer checks mínimos de calidad en scripts de npm.
3. Eliminar warning de build por asset faltante.

### Fase 2
1. Extraer hook `useCloudSync` desde `App.tsx`.
2. Extraer hook `useParkingState` (mutaciones de filas y reglas de negocio).
3. Mantener UI actual, solo mover lógica.

### Fase 3
1. Separar módulo de impresión (`usePrinting` + servicio).
2. Centralizar localStorage en un adaptador.
3. Agregar pruebas unitarias a utilidades clave (`calculateParkingStats`, `formatCurrency`).

### Fase 4
1. Reubicar archivos por dominio (features).
2. Reducir `App.tsx` a un shell de composición.
3. Introducir pruebas de integración básicas.

## Convenciones sugeridas

- **Hooks de dominio**: prefijo `use` y una sola responsabilidad.
- **Servicios puros**: sin acceso a estado React.
- **Tipos compartidos**: en `shared/types` o por feature si son específicos.
- **Errores de red**: siempre devolver resultado tipado (`{ ok, data, error }`).

## Criterios de éxito

- `App.tsx` por debajo de 200 líneas.
- Sin warnings de build por archivos faltantes.
- Scripts de validación ejecutables en local y CI.
