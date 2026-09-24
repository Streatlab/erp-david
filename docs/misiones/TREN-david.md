# 🚂 TREN DAVID-ERP — misiones encadenadas T1–T15 (sep 2026)

Fuente única: página Notion "🚂 TREN DAVID-ERP" en 99 Claude. Este fichero es su espejo para Claude Code.
Método: FLUJO ÓPTIMO v2 (contrato de tarea con DoD ≤ 3 criterios · gate vitest+tsc+build · regla 2-strikes · rama `trabajo`, commits con `[deploy]` para preview · master solo con "publica" de Rubén).
Aislamiento ABSOLUTO: solo repo erp-david, Supabase David (rribmludsuirmyprfkop), deploy davidparte. Nada de Binagre: ni código, ni tokens, ni datos.
Estilo visual: kit NeoUI (`src/components/neo/NeoUI.tsx`) + tokens `src/styles/neobrutal.ts`. Patrón: `src/pages/finanzas/Liquidaciones.tsx` y `RunningFamilia.tsx`.

## Reglas transversales (aplican a TODAS las misiones)
- **Cero datos TEST.** Ninguna pantalla muestra datos inventados. Si no hay datos reales: aviso "En construcción · sin datos" (AvisoNeo) y tabla vacía. Las pantallas holder SE QUEDAN en el menú.
- **Periodo semana/mes.** Toda pantalla con series temporales ofrece selector Semana/Mes (semana por defecto en lo doméstico, mes en lo fiscal). Presupuestos se fijan en €/mes y se reparten × 12 ÷ 52 para semanas.
- **Formato español** con `src/lib/format.ts` (fmtEur, fmtNum, fmtPct, fmtDate).
- **Emisores por fecha.** Nunca hardcodear quién factura qué código: usar `emisores_transportistas` / función `emisor_de(transportista, fecha)`.

## Datos de negocio fijos
- Códigos Cade → repartidor: **9392 David · 939 Joel · 9391 Saad · 972 Juan**.
- Hasta 31-ago-2026: David factura 9392, 939, 9391; Juan factura 972.
- Desde 1-sep-2026: David factura solo 9392; **Juan factura 972, 939 y 9391** (límites de facturación de autónomo).
- La facturación TOTAL del negocio = suma de los 4 códigos, la emita quien la emita y entre por la cuenta que entre. Vista `v_facturacion_total_david`.
- El dinero que cobra Juan por 939/9391 entra por una cuenta distinta y **es ingreso del negocio de David**, no ajeno.

## Ya hecho fuera del tren (no repetir)
- Migración Supabase a cuenta de David (completa, verificada).
- Login: PIN con hash verificado en servidor (`login_pin`), tabla `usuarios` cerrada al público.
- P&G: `v_pyg_mensual`, `v_pyg_resumen`, `v_pyg_hogar`, `v_pyg_global`, `v_pyg_hogar_semana`, `v_pyg_global_semana`, `v_efectivo`, `presupuestos_hogar`, `ambito` en categorías, `origen_efectivo` en conciliación.
- Emisores: `emisores_transportistas`, `emisor_de()`, `v_facturacion_consolidada`, `v_facturacion_total_david`.
- Enable Banking: `cuentas_bancarias` (+cuenta_uid, titular, descargar, personal), `banco_sesiones`, `banco_movimientos_raw`, `robot_credenciales`, `robot_log`, `robot_salud`. Función `banco-auth` desplegada.
- Cartero/liquidaciones: `correo_entrante`, `correo_reglas`, `reglas_liquidacion`, `liquidaciones_cade_lineas`, `envios_cade`, `documentacion_cade`, `v_liquidacion_repartidor`. Función `correo-auth` desplegada.
- Pantalla Running Familia (semanas/meses) publicada.

---

## BLOQUE A — DINERO

### T1 · Login con Google (BLOQUEADO: credenciales OAuth de Rubén)
Qué: botón "Entrar con Google" en `src/pages/Login.tsx` vía Supabase Auth; PIN se mantiene como respaldo.
- `usuarios` gana `email` (única). Rubén → admin, David → admin.
- Tras `signInWithOAuth`, resolver perfil por email con RPC security definer; si no existe, denegar con mensaje claro.
- `AuthContext` acepta las dos vías y expone el mismo `usuario`.
DoD: (1) Google entra como admin con el email correcto; (2) PIN sigue funcionando; (3) un email no dado de alta no entra.

### T2 · Robot bancario nocturno `banco-sync`
Qué: función Supabase `banco-sync` (Deno) que, por cada `banco_sesiones` `autorizada`, descarga transacciones de cada cuenta con `descargar = true` desde la última fecha conocida (o 2026-06-01 la primera vez) con Enable Banking (JWT RS256, `robot_credenciales` plataforma=enablebanking cuenta=david; firma igual que `banco-auth`).
- `banco_movimientos_raw` con `huella` = sha256(iban|fecha|importe|concepto|entry_reference). Sin duplicados.
- Volcado a `conciliacion`: `dedup_key` formato de `useConciliacion.ts` (`fecha|importe.00|concepto_lower|orden`), `tipo` por signo, `origen_efectivo = true` si concepto empieza por "Ret. efectivo". Guardar IBAN/cuenta de origen.
- Si la cuenta tiene `personal = true`, los movimientos sin regla van a `pendiente` con ámbito personal.
- Aplica `reglas_conciliacion` activas (patrón con `normalizarConcepto`). Sin regla → `pendiente-revisar-gasto` / `pendiente-revisar-ingreso`.
- `robot_log` y `robot_salud` (fuente `banco_sync`). Aviso si una sesión caduca en < 10 días.
- pg_cron diario 05:10 Europe/Madrid.
DoD: (1) ejecución manual trae movimientos reales y no duplica en segunda pasada; (2) aparecen en Conciliación categorizados; (3) cron visible en `cron.job`.

### T3 · Cuentas bancarias: pantalla real
Qué: `src/pages/configuracion/bancos/BancosPage.tsx` lee/escribe `cuentas_bancarias` y `banco_sesiones`. Sin mock.
- Por cuenta: alias, banco, IBAN enmascarado, titular, toggles **Descargar** y **Personal / Actividad**, flag **Cobro del negocio vía Juan**, estado de sesión y caducidad.
- Botón "Conectar banco" → `banco-auth?llave=david-banco-2026&accion=menu` en nueva pestaña.
- Aviso rojo si alguna sesión caduca en < 10 días.
DoD: (1) cambiar Personal afecta al ámbito de movimientos futuros; (2) caducidad visible por banco; (3) sin datos mock.

### T4 · Conciliación: destino del efectivo + ámbito
Qué: en `src/pages/Conciliacion.tsx` y `useConciliacion.ts`:
- Filtro "Solo efectivo" (`origen_efectivo`) y columna Destino: Prior, extras en mano, incentivos en mano, mantenimiento, alquiler furgoneta, gastos personales, sin justificar.
- Al asignar destino se crea/actualiza regla (aprendizaje existente).
- Chip de ámbito (actividad / personal / interno / pendiente) desde la categoría.
- KPI "Efectivo sin justificar" desde `v_efectivo`. Selector Semana/Mes.
DoD: (1) 22 retiradas pequeñas visibles con filtro; (2) asignar destino crea regla; (3) KPI cuadra con `v_efectivo`.

### T5 · Cartero de correo `correo-cartero` (BLOQUEADO: permiso Gmail)
Qué: función Supabase que lee Gmail (token `robot_credenciales` plataforma=google cuenta=cartero), clasifica por `correo_reglas`, guarda en `correo_entrante` con adjuntos en Storage bucket `correo`.
- `liquidacion` → llama a `liquidacion-parser` (T6). `penalizacion` → crea `reclamaciones_cade` abierta.
- pg_cron 05:00 Europe/Madrid. `robot_salud` fuente `cartero`.
DoD: (1) correo de prueba con adjunto queda en `correo_entrante` y Storage; (2) clasificación correcta; (3) cron visible.

### T6 · Parser liquidación Cade + factura por repartidor + envíos (BLOQUEADO: ejemplo real)
Qué: desde el PDF/Excel real, extraer por código y día: entregas, importe, garantía aplicada, penalización (motivo), extra (motivo) → `liquidaciones_cade` + `liquidaciones_cade_lineas`.
- Una `facturas_emitidas` por código con el **emisor vigente** (`emisor_de`), numeración correlativa por emisor.
- `envios_cade`: tipo `factura` (una por código) + tipo `documentacion` según `documentacion_cade`. Estado inicial `borrador`.
- Pantalla en Liquidaciones para aprobar y enviar (Gmail send con el mismo token). Nada sale sin aprobación.
DoD: (1) la liquidación de ejemplo cuadra con su total; (2) N facturas = N códigos con el emisor correcto según fecha; (3) envío aprobado llega a buzón de prueba con adjuntos.

---

## BLOQUE B — PANTALLAS VACÍAS QUE COBRAN VIDA

### T7 · Pagos y Cobros real
Qué: `src/pages/finanzas/PagosCobros.tsx` desde `facturas_emitidas` (cobros pendientes a Cade por emisor) y `conciliacion` (pagos). Marca cobrada cuando un ingreso de banco casa con el total de la factura (±1 €, ventana 15 días).
DoD: (1) lista de facturas pendientes de cobro con días de retraso; (2) cobro casado automáticamente con banco; (3) totales cuadran con `v_facturacion_total_david`.

### T8 · Ventas consolidadas
Qué: `src/pages/finanzas/Ventas.tsx` desde `v_facturacion_consolidada` + `v_liquidacion_repartidor`: por código/repartidor y periodo, total del negocio, emitido por David, emitido por Juan. Selector Semana/Mes.
DoD: (1) desde sep-2026 939/9391 aparecen emitidos por Juan y sumados al total de David; (2) desglose por repartidor; (3) cero datos TEST.

### T9 · Punto de equilibrio y Escenarios con costes reales
Qué: `PuntoEquilibrio.tsx` y `Escenarios.tsx` leen costes fijos reales (`furgonetas_prestamos`, `furgonetas_seguros`, cuota autónomo, gestoría) y variables (media 3 meses de conciliación por categoría). Escenarios: +/− un repartidor, +/− entregas/día, subida garantía.
DoD: (1) costes fijos = suma real de préstamos+seguros+cuotas; (2) punto de equilibrio en entregas/mes y €/mes; (3) cero datos TEST.

### T10 · Papeleo = bandeja del cartero
Qué: `src/pages/Papeleo.tsx` muestra `correo_entrante` (tipo, remitente, adjuntos, estado) y permite reclasificar (crea `correo_reglas`). Aviso "sin datos" hasta que T5 funcione.
DoD: (1) lista de correos procesados; (2) reclasificar crea regla; (3) cero datos TEST.

### T11 · Flota: mantenimiento, daños y fondo de reposición reales
Qué: `Mantenimiento.tsx`, `DanosVehiculos.tsx` y `flota/Reposicion.tsx` enganchados a las 4 furgonetas reales (`furgonetas`, `furgonetas_mantenimientos_hist`, `furgonetas_incidencias`, `furgonetas_prestamos`). Alta de mantenimiento/daño con coste; gastos de taller de conciliación se proponen como vínculo. Fondo de reposición = cuota mensual necesaria para sustituir cada furgoneta al fin de su vida útil.
DoD: (1) alta de mantenimiento y daño funcionan sobre furgonetas reales; (2) fondo calculado por furgoneta; (3) cero datos TEST.

### T12 · Entregas (depende de T6)
Qué: `src/pages/Entregas.tsx` desde `liquidaciones_cade_lineas`: entregas por día, código y repartidor; media diaria; días con penalización. Si Cade no da dato diario, mostrar mensual y aviso.
DoD: (1) cuadra con el total de la liquidación; (2) filtro por repartidor; (3) cero datos TEST.

---

## BLOQUE C — FUERA DATOS INVENTADOS

### T13 · Usuarios reales + limpieza de repo
Qué: `Usuarios.tsx` vía RPC de solo lectura (`usuarios_listado`: id, nombre, perfil, email, activo); cambio de PIN con RPC `usuario_cambiar_pin` (hash); activar/desactivar.
- Borrar documentación heredada de Binagre (docs/, README) y generar `docs/MAPA-CONTEXTO.md` con módulos, tablas y funciones reales de David.
DoD: (1) sin TEST en Usuarios; (2) cambiar PIN funciona y no expone hash; (3) `grep -ri binagre docs/` = 0.

### T14 · Personas y Organigrama reales
Qué: `equipo/Personas.tsx` y `equipo/Organigrama.tsx` sobre `equipo`/`empleados`/`conductores` reales: David, Juan, Joel, Saad (+ quien haya). Cada uno con código Cade, emisor vigente (`emisor_de`) y furgoneta asignada. Organigrama muestra quién factura a quién desde sep-2026. `Presencia.tsx`: sin datos → aviso holder honesto.
DoD: (1) 4 repartidores con código correcto; (2) emisor cambia según fecha; (3) cero datos TEST en las tres pantallas.

### T15 · Informes sobre datos reales + holders honestos
Qué: `informes/Informes.tsx` e `InformesEquipo.tsx` se reconstruyen sobre `v_pyg_resumen`, `v_pyg_global_semana`, `v_facturacion_total_david`, `v_liquidacion_repartidor`, `v_efectivo`. Checklists, Manuales y Libro Equipos: quitar datos TEST, dejar aviso "En construcción · sin datos", mantener en menú.
DoD: (1) informes cuadran con las vistas; (2) cero datos TEST en todo el ERP (`grep -ri "TEST ·" src/` = 0); (3) holders visibles con aviso.

---
Orden: T2 → T3 → T4 → T7 → T8 → T9 → T11 → T13 → T14 → T15 → T10 → (T1, T5, T6, T12 al desbloquear).
Cierre de cada misión: LOG de 1 línea al final de este fichero y en Notion, pendings al día, preview en rama `trabajo` con `[deploy]`. No se publica a master sin "publica" de Rubén.

## LOG
