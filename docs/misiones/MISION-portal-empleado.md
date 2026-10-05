# MISION portal-empleado

Objetivo de negocio: cada repartidor (David, Juan, Joel, Saad) entra en el ERP con su propio acceso
y ve SOLO lo suyo: su día, sus entregas, sus kilómetros (con foto obligatoria), su furgoneta, sus
permisos, sus incentivos, sus acuerdos y su carpeta. Rubén deja de perseguir a nadie por WhatsApp
para saber km, revisiones o permisos. Es T16 + T17 del TREN-david-D, ampliado por Rubén (3-oct-2026).

Mecanismo CALCADO de Binagre (excepción T1: copiar mecanismo, nunca datos ni diseño). Referencias de
lectura en Streatlab/binagre (rama trabajo): `src/pages/equipo/TabPortal.tsx` (pestañas por `?tab=`,
`usuario.empleado_id`, selector "Ver portal como" para admin, guard si no hay ficha), `TabPermisos.tsx`
(dar/quitar pantallas por persona), `src/lib/permisos/*`, `src/context/AuthContext.tsx` (Google +
enlace mágico + PIN + huella por dispositivo). Diseño: NeoUI de David (`src/styles/neobrutal.ts`,
`src/components/neo/NeoUI.tsx`), letra grande en móvil (nada < 14 px), palabras de persona.

Repo: Streatlab/erp-david · rama master · AISLAMIENTO: nada de Binagre en código, tokens ni tablas.
Supabase: David Nuevo (rribmludsuirmyprfkop). Tablas que YA existen y se reutilizan (no duplicar):
`usuarios`, `conductores`, `empleados`, `accesos_pin`, `accesos_huella`, `furgonetas`,
`furgonetas_partes_km`, `furgonetas_itv`, `furgonetas_mantenimientos_hist`, `furgonetas_incidencias`,
`furgonetas_fotos`, `liquidaciones_cade_entregas`, `reglas_liquidacion`, `avisos_whatsapp`.

## FASE 0 · Acceso y permisos (base de todo)
- `usuarios` gana `rol` ('admin' | 'repartidor', default según `perfil`) y `conductor_id` → `conductores.id`.
  Semilla: David ↔ conductor David, Juan ↔ Juan, Joel ↔ Joel, Saad ↔ Saad. Rubén y David siguen admin.
- Tabla `permisos_erp` (usuario_id, pantalla, permitido, updated_at) + `src/lib/permisos.ts` con
  `puedeVer(pantalla)`. Pantallas del repartidor: hoy, semana, kilometros, furgoneta, permisos,
  incentivos, acuerdos, carpeta, avisos. Default: todas permitidas para rol repartidor.
- Login: el repartidor entra por el MISMO flujo que ya existe (Google / enlace mágico / PIN / huella).
  Si `usuarios.rol = 'repartidor'`, tras login va a `/portal`, nunca a `/`.
- `ProtectedRoute`: rol repartidor NO puede abrir ninguna ruta de admin ni por URL → redirige a `/portal`.
- RLS: cada tabla del portal filtra por `conductor_id` del usuario (función `mi_conductor_id()`).
- Pantalla admin `Configuración ▸ Permisos`: lista de repartidores × pantallas con interruptores.
Criterio F0: Joel entra y aterriza en /portal; escribir /flota a mano lo devuelve a /portal;
admin quita "furgoneta" a Joel y la pestaña desaparece al recargar.

## FASE 1 · Portal, cáscara y pestañas
- Ruta `/portal` → `src/pages/portal/Portal.tsx` con pestañas por `?tab=` (como TabPortal de Binagre):
  Hoy · Mi semana · Kilómetros · Mi furgoneta · Permisos · Mis incentivos · Mis acuerdos ·
  Mi carpeta · Avisos. Solo se pintan las permitidas por `permisos_erp`.
- Cabecera: "Hola, {nombre}" + frase de estado (ruta de hoy, furgoneta asignada, si faltan km).
- Admin ve `/portal` con selector "Ver portal como" (igual que Binagre).
- Menú lateral para rol repartidor: SOLO "Mi portal" y "Salir". Nada más.
Criterio F1: `grep -c "tab=" src/pages/portal/Portal.tsx` ≥ 9; tsc limpio.

## FASE 2 · Kilómetros con foto (bloqueo suave) — cierra lo pedido por Rubén
- Tabla `kilometros` (id, conductor_id, furgoneta_id, fecha, momento 'inicio_semana'|'fin_semana',
  km_leido, km_ocr, foto_url, confianza, estado 'ok'|'revisar', created_at). Bucket storage `km-fotos`
  (privado, RLS por conductor).
- Pantalla Kilómetros: botón grande "Hacer foto del cuentakilómetros" (input capture=environment),
  sube la foto, OCR en función Supabase `km-ocr` (Gemini Vision con clave en `robot_credenciales`;
  si no hay clave, se salta el OCR y pide la cifra a mano — NUNCA bloquea), muestra la cifra propuesta
  en grande, el repartidor confirma o corrige, guarda.
- Obligación: lunes = inicio, domingo = fin. Si falta el registro de la semana en curso, al entrar al
  portal se abre Kilómetros y las demás pestañas quedan atenuadas con aviso claro ("Primero apunta
  los km de hoy"). Admin nunca se bloquea.
- Reglas: si km_leido < último registro → estado 'revisar'; si salta > 2.000 km → 'revisar'.
- Al guardar: `furgonetas.km_actual = km_leido` y `furgonetas_reposicion_params.km_actual = km_leido`
  (así el fondo de reposición se alimenta solo). Trigger en BD, no en cliente.
- Vista `v_km_semana` (furgoneta, semana, km_inicio, km_fin, km_hechos) y en
  `furgonetas_reposicion_params.km_anio` se recalcula cada domingo con la media de las últimas
  8 semanas × 52 (función SQL `recalcular_km_anio()` llamada por el trigger).
- Historial del repartidor: lista de sus lecturas con foto en miniatura y km de cada semana.
- Aviso WhatsApp a Rubén lunes y domingo 21:00 con quién no ha apuntado (usar `avisos_whatsapp`
  y el Green API ya dado de alta; si no existe cron, dejar la función lista y anotarlo en el INFORME).
Criterio F2: subir una foto (o cifra manual) crea fila en `kilometros`, actualiza `furgonetas.km_actual`
y `furgonetas_reposicion_params.km_actual` de esa furgoneta; con el registro hecho se desbloquean las
pestañas.

## FASE 3 · Hoy y Mi semana (datos de trabajo)
- Hoy: ruta asignada, furgoneta, entregas de hoy (`liquidaciones_cade_entregas` por su código de
  transportista vía `emisores_transportistas`), € del día frente a su garantía diaria
  (`reglas_liquidacion` garantia_dia), km apuntados sí/no, avisos sin leer.
- Mi semana: entregas por día (gráfico de barras NeoUI), total semana, media/día, comparación con la
  semana anterior, incidencias (líneas negativas) de la semana, kilos. Selector Semana/Mes.
  Solo SUS filas. Nada de dinero de otros, ni facturas, ni bancos.
Criterio F3: con `972.pdf` cargado, Juan ve sus entregas por día y el total del mes; Joel ve 0 y un
mensaje claro, no un error.

## FASE 4 · Mi furgoneta
- Ficha de su furgoneta (asignación por `conductores` ↔ `furgonetas.conductor_id`): matrícula, modelo,
  km actuales, próxima revisión (`furgonetas_mantenimientos_hist` + km_proxima_revision), ITV
  (`furgonetas_itv`: fecha, estado, días que faltan en grande y en rojo si < 30), seguro
  (`furgonetas_seguros`: vencimiento), préstamo NO (es dinero: solo admin).
- Botón "Avisar de un daño o avería": foto + texto → `furgonetas_incidencias` con conductor_id.
- Checklist semanal rápido (luces, ruedas, limpieza, carga) → `checklist_ejecuciones` si encaja; si no,
  tabla `furgoneta_checklist_semanal`.
Criterio F4: Juan ve la ITV de 6184 NBV con los días que faltan; crea una incidencia con foto y aparece
en la pantalla admin de Flota ▸ incidencias.

## FASE 5 · Permisos, incentivos, acuerdos, carpeta, avisos
- Permisos: tabla `solicitudes_permisos` (conductor_id, tipo vacaciones|asuntos_propios|baja|otro,
  fecha_inicio, fecha_fin, nota, estado pendiente|aprobado|rechazado, respuesta_admin). Pantalla:
  saldo del año (días anuales en `conductores.dias_vacaciones_anuales`, default 30), "Pedir permiso"
  (modal), lista con estado. Admin aprueba/rechaza desde `Equipo ▸ Permisos` (nueva pestaña).
- Incentivos: tabla `incentivos_reglas` (conductor_id o null=todos, tipo: entregas_semana|garantia|
  sin_incidencias|km_apuntados, umbral, premio_eur, vigente_desde/hasta) + vista `v_incentivos_mes`
  que calcula en vivo desde entregas/kilometros/incidencias. Pantalla: qué premio hay, cuánto lleva,
  cuánto le falta, en grande. Admin edita reglas en `Equipo ▸ Incentivos`.
- Acuerdos: tabla `acuerdos_empleado` (conductor_id, titulo, texto, fecha, firmado_at, pdf_url).
  Pantalla: lista de sus acuerdos, botón "He leído y acepto" que guarda firmado_at + IP + fecha.
  Admin crea acuerdos en `Equipo ▸ Acuerdos` (texto libre + opción de PDF).
- Mi carpeta: `empleado_documentos` (conductor_id, tipo, nombre, url, fecha) — lo que admin comparta
  (contrato, nómina, carnet). Nada que no sea suyo.
- Avisos: tabla `avisos_portal` (conductor_id o null=todos, texto, creado_por, leido_at). Admin envía
  desde `Equipo ▸ Avisos`; el repartidor los marca leídos.
Criterio F5: Saad pide vacaciones → admin las ve pendientes y aprueba → Saad ve "Aprobada".

## FASE 6 · Gate y entrega
- `npx tsc -b` y `npm run build` limpios. Greps de aislamiento Binagre a 0.
- Semilla real: los 4 usuarios enlazados a sus conductores, permisos por defecto, cero datos TEST.
- INFORME con: qué queda para que Rubén dé de alta la clave de Gemini (si no existe) y el cron.

## Propuestas añadidas (hacer si cabe, anotar si no)
1. "Mi mes en una frase" en Hoy: entregas, km y € del mes, comparado con el anterior.
2. Botón "Llamar a Rubén" y "Escribir por WhatsApp" fijos abajo en móvil.
3. Recordatorio de ITV y revisión al repartidor 15 días antes, por aviso en portal.

## Decisiones ya tomadas (no re-decidir)
- Rama master, un push final. No tocar la lógica de `src/lib/flota/reposicion.ts` salvo lo de km_actual.
- Si falta una clave o un dato: elegir la opción conservadora, anotar en CHECK y seguir.
