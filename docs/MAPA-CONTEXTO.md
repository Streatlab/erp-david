# Mapa de contexto — ERP David Reparte

Orientarse sin explorar el repo. Actualizado: 2 oct 2026 (tren T1–T15).

## Negocio
- David: autónomo subcontratista de Cade. Reparte para Mercadona, Carrefour, Lidl y Día en Alcoi y Ontinyent.
- Códigos Cade → repartidor: 9392 David · 939 Joel · 9391 Saad · 972 Juan.
- Emisores: hasta 31-ago-2026 David factura 9392/939/9391 y Juan 972; desde 1-sep-2026 David solo 9392 y Juan 972/939/9391 (`emisores_transportistas`, `emisor_de()`).
- Facturación total del negocio = suma de los 4 códigos (`v_facturacion_total_david`).

## Infraestructura
- Web: Vercel «davidparte» (davidparte.vercel.app). Rama de trabajo con commits `[deploy]` → preview; producción solo con «publica» de Rubén.
- Supabase David: rribmludsuirmyprfkop. Migraciones en `supabase/migrations/`, funciones en `supabase/functions/`.
- Estilo: kit NeoUI (`src/components/neo/NeoUI.tsx`) + tokens `src/styles/neobrutal.ts`. Formato español con `src/lib/format.ts`.
- Gate antes de cada commit: `npx vitest run` · `npx tsc -b` · `npm run build`.

## Acceso (T1)
- Sesión real de Supabase Auth. Lista blanca: `usuarios` (email, perfil, activo). RPC `mi_usuario`, `email_autorizado`, `login_google`.
- Entrada: Google · enlace mágico · PIN de 4 cifras por dispositivo · huella (WebAuthn).
- Tablas: `accesos_pin` (bloqueo 5 fallos/15 min, `revocado`), `accesos_huella`, `accesos_retos`.
- Función Supabase `acceso` (metodos, pin-crear, pin-entrar, huella-registrar, huella-reto, huella-entrar).
- Cliente: `src/context/AuthContext.tsx`, `src/lib/accesoRapido.ts`, `src/lib/dispositivo.ts`, `src/lib/passkey.ts`, `src/pages/Login.tsx`.
- Admin de usuarios: RPC `usuarios_listado`, `usuario_guardar`, `usuario_dispositivos`, `usuario_reset_dispositivo` (solo `es_admin()`).

## Robots (pg_cron, hora de Madrid todo el año)
| Robot | Hora | Qué hace |
|---|---|---|
| `correo-cartero` | 05:00 | Gmail de David → `correo_entrante` + adjuntos en Storage `correo`; penalización → `reclamaciones_cade` |
| `banco-sync` | 05:10 | Enable Banking → `banco_movimientos_raw` → `conciliacion` (reglas, cuentas personales, cuenta de origen) |
| `casar_cobros()` | 05:30 | Factura pendiente ↔ ingreso del banco (±1 €, 15 días) |
- Salud y registro: `robot_salud`, `robot_log`. Credenciales: `robot_credenciales` (enablebanking, google app/cartero, green_api).
- Otras funciones: `banco-auth` (conectar banco), `correo-auth` (conectar buzón).

## Módulos (ruta → fuente de datos)
| Pantalla | Ruta | Datos |
|---|---|---|
| Panel global | `/` | conciliación, facturas, flota |
| Conciliación | `/conciliacion` | `conciliacion`, `reglas_conciliacion`, `v_efectivo`, categorías con `ambito` |
| Bancos y cuentas | `/configuracion/bancos` | `cuentas_bancarias` (descargar, personal, cobro_via_juan), `banco_sesiones` |
| Facturación emitida | `/finanzas/facturacion` | `facturas_emitidas` |
| Ventas | `/finanzas/ventas` | `v_facturacion_consolidada`, `v_liquidacion_repartidor` |
| Pagos y cobros | `/finanzas/pagos-cobros` | `facturas_emitidas` (+cobro_conciliacion_id), `conciliacion`, `v_facturacion_total_david` |
| Punto de equilibrio / Escenarios | `/punto-equilibrio`, `/finanzas/escenarios` | `conciliacion` (media 3 meses cerrados), facturas, `liquidaciones_cade` |
| Running / Running Familia | `/running`, `/finanzas/running-familia` | `v_pyg_*`, `presupuestos_hogar` |
| Liquidaciones | `/finanzas/liquidaciones` | `liquidaciones_cade`, `liquidaciones_cade_lineas` (lector pendiente, T6) |
| Papeleo | `/papeleo` | `correo_entrante`, `correo_reglas` |
| Reclamaciones Cade | `/reclamaciones` | `reclamaciones_cade` |
| Flota / ficha | `/flota`, `/flota/:codigo` | `furgonetas`, `furgonetas_seguros`, `furgonetas_itv`, `furgonetas_fotos`, `conductores` |
| Mantenimiento / Daños | `/mantenimiento`, `/danos-vehiculos` | `furgonetas_mantenimientos_hist`, `furgonetas_incidencias` (+vínculo a `conciliacion`) |
| Fondo de reposición | `/flota/reposicion` | `furgonetas_reposicion_params`, `furgonetas_prestamos` |
| Personas / Organigrama / Presencia | `/personal`, `/organigrama`, `/presencia` | `equipo`, `empleados`, `conductores`, `emisores_transportistas` |
| Informes | `/informes`, `/informes-equipo` | `v_pyg_resumen`, `v_pyg_global_semana`, `v_facturacion_total_david`, `v_liquidacion_repartidor`, `v_efectivo` |
| Usuarios | `/configuracion/usuarios` | RPC de usuarios (arriba) |

## Datos de relleno conocidos (no usar como reales)
- `furgonetas_prestamos` y `furgonetas_seguros` con entidad/compañía «Mockup»: pendientes de pólizas y préstamos reales.

## Pendientes fuera del tren
- T6 lector de liquidaciones Cade (ya hay PDFs reales en Storage `correo`, jun–ago 2026) y T12 Entregas.
