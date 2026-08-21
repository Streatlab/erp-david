# INFORME · reposicion-supabase

Ejecutada por Claude en el chat (modo /mision-chat), 22 ago 2026.

## Qué se hizo

- **F1 · Base de datos**: `supabase/migrations/017_reposicion_params.sql` — tabla
  `furgonetas_reposicion_params`, trigger de `updated_at`, RLS con el patrón
  `FOR ALL TO anon, authenticated` que usa el resto de la flota.
- **F2 · Librería**: `src/lib/flota/reposicion.ts` — añadidos `cargarParamsRemoto`
  y `guardarParamRemoto`. `cargarDatos` lee de la base de datos primero y sube en
  silencio lo que ya hubiera guardado en el navegador. Ninguna de las dos funciones
  lanza excepción: si Supabase falla, la pantalla sigue funcionando con localStorage.
- **F3 · Pantalla**: `src/pages/flota/Reposicion.tsx` — guardado con retardo de 600 ms
  por furgoneta (no escribe en cada tecla) e indicador Guardando… / Guardado /
  Solo en este navegador. Pie de tabla actualizado.
- **F4 · Doc**: `docs/SUPABASE-REPOSICION.md` con los 5 pasos para aplicar la migración.

## Lógica de cálculo

Sin tocar. `calcular`, `resumirFlota` y `aportacionPorAnio` quedan idénticas.

## Verificación

- `npx tsc --noEmit` → 0 errores, ejecutado sobre el repo ya subido (no sobre el local).
- `npm run build` → OK, 2,15 s.
- Huellas md5 del repo remoto idénticas a las del contenedor.
- Greps de aislamiento Binagre (B01D23, 1e2233, e8f442, escandallo, Uber Eats,
  Glovo, eryauogxcpbgdryeimdq) → 0 coincidencias en los archivos tocados.

## Pendiente de Rubén

1. **Aplicar la migración en Supabase** (SQL Editor). Hasta entonces la pantalla
   guarda solo en el navegador y lo avisa. No hay acceso a Supabase desde el chat.
2. Decidir sobre el login: los PIN siguen en texto plano en la tabla `usuarios`,
   y el repo es público. Fuera del alcance de esta misión, pero sigue abierto.

## Incidencia registrada

`npm install` falló en silencio en el primer intento y `npx tsc --noEmit` devolvió 0
sin haber comprobado nada (falso positivo). Regla nueva: verificar que `node_modules`
existe antes de fiarse de un tsc limpio.

- a la primera: NO
- fases con reintento: 1 (F4, por el falso positivo de tsc)
- error repetido de misiones anteriores: ninguno
