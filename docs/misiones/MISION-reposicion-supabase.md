# MISION reposicion-supabase

Objetivo de negocio: los datos del fondo de reposicion de flota (precio de furgo nueva, km/ano,
vida util, inflacion, residual, ya ahorrado) hoy viven SOLO en el navegador. Es un plan a 7 anos:
tienen que vivir en la base de datos y verse desde cualquier dispositivo.

Repo: Streatlab/erp-david · rama trabajo · NADA de Binagre/Streat Lab.

## Archivos exactos a tocar (no explorar fuera de esta lista)
1. `supabase/migrations/20260822_reposicion_params.sql` (NUEVO)
2. `src/lib/flota/reposicion.ts` (MODIFICAR)
3. `src/pages/flota/Reposicion.tsx` (MODIFICAR)
4. `docs/SUPABASE-REPOSICION.md` (NUEVO, 15 lineas max)

## FASE 1 · Migracion SQL
Crear `supabase/migrations/20260822_reposicion_params.sql` con:
- Tabla `furgonetas_reposicion_params`:
  `furgoneta_id uuid PRIMARY KEY REFERENCES furgonetas(id) ON DELETE CASCADE`,
  `fecha_compra date`, `km_actual numeric`, `km_anio numeric`, `vida_km numeric`,
  `vida_anios numeric`, `precio_nuevo_hoy numeric`, `inflacion numeric`,
  `residual_pct numeric`, `ahorro_acumulado numeric`,
  `updated_at timestamptz NOT NULL DEFAULT now()`.
- Trigger que actualiza `updated_at` en cada UPDATE.
- RLS ACTIVADO + politica de lectura y escritura para el rol `anon` (el ERP entra con la clave
  publica; el resto de tablas del repo siguen ese mismo patron — verificar en otra migracion
  existente antes de escribir y copiar el patron que ya se use).

Criterio objetivo F1: el archivo existe y `grep -c "furgonetas_reposicion_params"` >= 3.

## FASE 2 · Persistencia en la libreria
En `src/lib/flota/reposicion.ts`:
- Anadir `cargarParamsRemoto(): Promise<Record<string, ParamsReposicion>>` que lee la tabla nueva
  y mapea snake_case → camelCase del interface `ParamsReposicion`.
- Anadir `guardarParamRemoto(p: ParamsReposicion): Promise<boolean>` con `upsert` por `furgoneta_id`.
- `cargarDatos()` pasa a: remoto primero; si el remoto viene vacio para una furgoneta, usar el valor
  de localStorage (migracion silenciosa) y subirlo con `guardarParamRemoto`.
- MANTENER `cargarParams`/`guardarParams` (localStorage) como respaldo si Supabase falla: la pantalla
  nunca puede quedarse sin guardar. Nunca lanzar excepcion hacia la pantalla.
- No cambiar NADA de `calcular`, `resumirFlota` ni `aportacionPorAnio`. La logica de calculo esta
  validada y no se toca.

Criterio objetivo F2: `grep "guardarParamRemoto" src/lib/flota/reposicion.ts` aparece >= 2 veces
y `npx tsc -b` sin errores.

## FASE 3 · Pantalla
En `src/pages/flota/Reposicion.tsx`:
- `setCampo` llama a `guardarParamRemoto` ademas de a `guardarParams` (debounce 600 ms por furgoneta,
  para no escribir en cada tecla).
- Indicador discreto de estado junto al boton Datos: "Guardado" / "Guardando…" / "Solo en este
  navegador" (si el remoto fallo). Estilo neobrutal existente, sin inventar componentes nuevos.
- Cambiar el pie de la tabla: ya no dice "se guardan en este navegador" sino "se guardan en la base
  de datos".

Criterio objetivo F3: `grep "Solo en este navegador" src/pages/flota/Reposicion.tsx` devuelve 1
y el texto viejo "se guardan en este navegador" ya NO aparece.

## FASE 4 · Doc y gate
- `docs/SUPABASE-REPOSICION.md`: 15 lineas max, en castellano llano, explicando que tabla se ha
  creado y como aplicar la migracion desde el panel de Supabase (pasos numerados, sin jerga).
- Gate final: `npx tsc -b` y `npm run build` sin errores.

Criterio objetivo F4: ambos comandos terminan en codigo 0.

## Decisiones ya tomadas (no re-decidir)
- Si no hay acceso para aplicar la migracion desde Code: dejar el .sql en el repo y marcarlo en el
  INFORME como "pendiente de aplicar en Supabase por Ruben". No bloquea la mision.
- No tocar el login ni AuthContext en esta mision.
- No tocar master. Entrega en rama trabajo.
