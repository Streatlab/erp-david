# 🚂 TREN DAVID-ERP — misiones encadenadas (sep 2026)

Fuente única: página Notion "🚂 TREN DAVID-ERP" en 99 Claude. Este fichero es su espejo para Claude Code.
Método: FLUJO ÓPTIMO v2 (contrato de tarea con DoD ≤ 3 criterios · gate vitest+tsc+build · regla 2-strikes · rama `trabajo`, commits con `[deploy]` para preview · master solo con "publica" de Rubén).
Aislamiento ABSOLUTO: solo repo erp-david, Supabase David (rribmludsuirmyprfkop), deploy davidparte. Nada de Binagre: ni código, ni tokens, ni datos.
Estilo visual: kit NeoUI (`src/components/neo/NeoUI.tsx`) + tokens `src/styles/neobrutal.ts`. Ver `src/pages/finanzas/Liquidaciones.tsx` y `RunningFamilia.tsx` como patrón.

## Ya hecho fuera del tren (no repetir)
- Migración Supabase a cuenta de David (completa, verificada).
- Login: PIN con hash verificado en servidor (`login_pin`), tabla `usuarios` cerrada al público.
- Tablas/vistas P&G: `v_pyg_mensual`, `v_pyg_resumen`, `v_pyg_hogar`, `v_pyg_global`, `v_pyg_hogar_semana`, `v_pyg_global_semana`, `v_efectivo`, `presupuestos_hogar`, `ambito` en categorías.
- Infra Enable Banking: `cuentas_bancarias` (+cuenta_uid, titular, descargar, personal), `banco_sesiones`, `banco_movimientos_raw`, `robot_credenciales`, `robot_log`, `robot_salud`. Función `banco-auth` desplegada.
- Infra cartero/liquidaciones: `correo_entrante`, `correo_reglas`, `reglas_liquidacion`, `liquidaciones_cade_lineas`, `envios_cade`, `documentacion_cade`, `v_liquidacion_repartidor`. Función `correo-auth` desplegada.
- Pantalla Running Familia (semanas/meses) publicada.

---

## T1 · Login con Google (bloqueado hasta credenciales OAuth de Rubén)
Qué: botón "Entrar con Google" en `src/pages/Login.tsx` vía Supabase Auth; PIN se mantiene como respaldo.
- Tabla `usuarios` gana columna `email` (única). Mapear: Rubén → admin, David → admin.
- Tras `signInWithOAuth`, resolver perfil por email; si no existe, denegar con mensaje claro.
- `AuthContext` acepta las dos vías (sesión Supabase o PIN) y expone el mismo `usuario`.
DoD: (1) login Google entra como admin con el email correcto; (2) PIN sigue funcionando; (3) un email no dado de alta no entra.

## T2 · Robot bancario nocturno `banco-sync`
Qué: función Supabase `banco-sync` (Deno) que, para cada `banco_sesiones` en estado `autorizada`, descarga transacciones de cada cuenta con `descargar = true` desde el último `fecha` conocido (o 2026-06-01 la primera vez) usando Enable Banking (JWT RS256 con `robot_credenciales` plataforma=enablebanking cuenta=david; ver `banco-auth` como referencia de firma).
- Guarda en `banco_movimientos_raw` con `huella` = sha256(iban|fecha|importe|concepto|entry_reference). Ignora duplicados.
- Volcado a `conciliacion`: `dedup_key` con el formato de `useConciliacion.ts` (`fecha|importe.00|concepto_lower|orden`), `tipo` por signo, `origen_efectivo = true` si concepto empieza por "Ret. efectivo".
- Aplica `reglas_conciliacion` activas (patrón normalizado con `normalizarConcepto`) para `categoria`. Si no hay regla → `pendiente-revisar-gasto` / `pendiente-revisar-ingreso`.
- Escribe `robot_log` y `robot_salud` (fuente `banco_sync`). Avisa en log si una sesión caduca en < 10 días.
- Cron pg_cron: todos los días a las 05:10 Europe/Madrid.
DoD: (1) ejecución manual trae movimientos reales de al menos una cuenta sin duplicar en segunda pasada; (2) aparecen en Conciliación categorizados por reglas; (3) cron creado y visible en `cron.job`.

## T3 · Cuentas bancarias: pantalla real
Qué: `src/pages/configuracion/bancos/BancosPage.tsx` deja de ser mock y lee/escribe `cuentas_bancarias` y `banco_sesiones`.
- Por cuenta: alias, banco, IBAN enmascarado, toggles **Descargar** y **Personal / Actividad**, estado de la sesión y fecha de caducidad.
- Botón "Conectar banco" que abre `banco-auth?llave=david-banco-2026&accion=menu` en nueva pestaña.
- Aviso rojo si alguna sesión caduca en < 10 días.
DoD: (1) cambiar "Personal" en una cuenta afecta al ámbito de sus movimientos futuros; (2) se ve la fecha de caducidad de cada banco; (3) sin datos mock.

## T4 · Conciliación: destino del efectivo + ámbito
Qué: en `src/pages/Conciliacion.tsx` y `useConciliacion.ts`:
- Filtro "Solo efectivo" (`origen_efectivo`) y columna Destino con las categorías de efectivo (Prior, extras en mano, incentivos en mano, mantenimiento, alquiler furgoneta, gastos personales, sin justificar).
- Al categorizar un movimiento de efectivo se crea/actualiza regla como ahora (aprendizaje).
- Chip de ámbito (actividad / personal / interno / pendiente) leído de la categoría.
- KPI "Efectivo sin justificar" desde `v_efectivo`.
DoD: (1) 22 retiradas pequeñas visibles con filtro; (2) asignar destino a una crea regla; (3) KPI cuadra con `v_efectivo`.

## T5 · Cartero de correo `correo-cartero` (bloqueado hasta permiso Gmail)
Qué: función Supabase que lee Gmail (token en `robot_credenciales` plataforma=google cuenta=cartero), clasifica por `correo_reglas`, guarda en `correo_entrante` con adjuntos en Storage bucket `correo`.
- Para tipo `liquidacion`: llama a `liquidacion-parser` (T6). Para `penalizacion`: crea `reclamaciones_cade` en estado abierta.
- Cron pg_cron 05:00 Europe/Madrid. `robot_salud` fuente `cartero`.
DoD: (1) un correo de prueba con adjunto queda en `correo_entrante` y el adjunto en Storage; (2) clasificación correcta por reglas; (3) cron visible.

## T6 · Parser de liquidación Cade + factura por repartidor + envíos (bloqueado hasta ejemplo real)
Qué: a partir del PDF/Excel real que aporte Rubén, extraer por transportista y día: entregas, importe, garantía aplicada, penalización (motivo), extra (motivo) → `liquidaciones_cade` + `liquidaciones_cade_lineas`.
- Generar `facturas_emitidas` por emisor/transportista con numeración correlativa existente y `envios_cade` tipo `factura` (una por repartidor) + tipo `documentacion` según `documentacion_cade`.
- Estado inicial `borrador`; pantalla en Liquidaciones para aprobar y enviar (Gmail send con el mismo token). Nada se envía sin aprobación.
DoD: (1) la liquidación de ejemplo se lee sin errores y cuadra con el total; (2) se generan N facturas = N transportistas; (3) el envío aprobado llega a un buzón de prueba con los adjuntos.

## T7 · Usuarios reales + limpieza
Qué: `Usuarios.tsx` lee `usuarios` vía RPC de solo lectura (`usuarios_listado`: id, nombre, perfil, email, activo) y permite cambiar PIN (RPC `usuario_cambiar_pin` con hash) y activar/desactivar.
- Borrar del repo toda documentación heredada de Binagre (docs/, README) y generar `docs/MAPA-CONTEXTO.md` con módulos, tablas y funciones reales de David.
DoD: (1) sin datos TEST en Usuarios; (2) cambiar PIN funciona y no expone hash; (3) `grep -ri binagre` en docs/ devuelve 0.

---
Orden sugerido: T2 → T3 → T4 → T7 → (T1, T5, T6 cuando se desbloqueen).
Cierre de cada misión: LOG de 1 línea aquí y en Notion, pendings al día, preview en rama trabajo con `[deploy]`.
