# 🚂 TREN DAVID-ERP · BLOQUE D — Liquidaciones Cade, repartidores y portal del empleado (oct 2026)

Continúa `TREN-david.md` (mismas reglas, mismo aislamiento, mismo estilo NeoUI, misma excepción de T1 para copiar mecanismos de Binagre sin copiar datos ni diseño). Ejecutar en orden: **T6 → T18 → T12 → T16 → T17**. Nada se envía a Cade ni a nadie sin aprobación de Rubén.

## Contrato de datos de la liquidación de Cade (ejemplo real: `972.pdf`, septiembre 2026)
- Un PDF por **código de transportista** y mes. Cabecera: `Transportista: 972, Fecha registro: 01/09/26..30/09/26`. Generado el día 2 del mes siguiente.
- Línea de entrega: `cliente · ref. cliente · conductor · F. entrega · destino · kilos · importe base · Cmpl.mín · fijo · kms · importe`. Precios vistos: 5,50 € (CONSUM, MYM), 8,50 € (SUPECO). `Cmpl.mín` = complemento hasta la **garantía diaria** (`reglas_liquidacion` concepto `garantia_dia`: Juan 130 €, David 150 €).
- Cierre de día: `TOTAL CONDUCTOR 972 ENTREGAS n · importe · complemento · fijo · total`.
- **Incidencia** = cualquier línea con importe negativo sin ref. de cliente (p. ej. `SPC 25/09/26 -80,67`). Guardar código de incidencia (`SPC`), día, importe, y el impacto en el total del día.
- Cierre de mes: `T O T A L ENTREGAS 267 · base 1.490,33 · complemento 1.809,00 · total 3.299,33`. **El parser debe cuadrar** suma de días = total del PDF; si no cuadra, estado `error_cuadre` y no se factura.
- Alertas que el parser debe detectar: referencias de cliente repetidas el mismo día (en el ejemplo: 04/09 `0651202609041031` y 12/09 `0651202609120749`), días sin entregas, días con complemento > 70% del total.

## T6 · Liquidaciones Cade — pantalla específica en Facturación
Pantalla `Facturación ▸ Liquidaciones Cade` con 5 pestañas:
1. **Bandeja**: subir PDF (drag & drop, varios a la vez) o llegada por cartero. Estados: recibida → leída → cuadrada → facturada → enviada → cobrada / error_cuadre. Muestra código, repartidor (`emisores_transportistas`), mes, entregas, base, complemento, incidencias, total.
2. **Detalle**: tabla por día (entregas, base, complemento, total, incidencias) y desplegable por entrega (cliente, destino, kilos). Selector Semana/Mes.
3. **Facturas**: una `facturas_emitidas` por liquidación: base = total liquidación, IVA 21%, **emisor = `emisor_de(código, fecha_registro)`**, numeración correlativa por emisor (seguir la serie existente en `facturas_emitidas`), PDF generado con datos fiscales y firma del emisor (`config_emisores`; si faltan dirección/IBAN, pedirlos a Rubén en el LOG, no inventar). Estados borrador → aprobada → enviada → cobrada.
4. **Envíos**: un borrador por emisor en `envios_cade`: remitente **David = davidsanzn@gmail.com**, **Juan = admin@streatlab.com** (cada uno con su firma, en `config_emisores.firma_html`), destinatario Cade (`documentacion_cade` / config), adjuntos: factura PDF + liquidación + documentación marcada obligatoria. Botón "Enviar" solo para admin; sale por Gmail API con el token del buzón del emisor (`robot_credenciales` google/cartero para David, google/cartero-juan para Juan). Extender `correo-auth` con `?cuenta=juan` para autorizar admin@streatlab.com.
5. **Incidencias**: lista de todas las líneas negativas por liquidación, día, código, repartidor, importe. **No abre reclamaciones.** Botón "Proponer reclamación" → genera borrador de correo a Cade en `envios_cade` tipo `reclamacion` en estado borrador. Correo-resumen semanal a Rubén (lunes 08:00) con las incidencias nuevas y el botón/enlace para aprobar cada una.
Dinero: cada liquidación cuadrada crea ingreso esperado por código; `casar-cobros` lo casa con banco (cuenta de Juan incluida: marcar en `cuentas_bancarias` las cuentas cotitulares como `cobro_negocio = true`). Provisión de IVA: vista `v_iva_provision` (21% de lo facturado no liquidado).
Robot bancario (arreglo obligatorio en esta misión): `banco-sync` debe guardar en `notas` `contraparte · concepto completo · últimos 4 del IBAN` y aplicar `reglas_conciliacion` también sobre contraparte; nunca categorizar ingresos de terceros como `movimientos-internos` (solo traspasos entre cuentas propias descargadas).
DoD: (1) `972.pdf` se lee, cuadra a 3.299,33 y detecta la SPC de −80,67 y las dos referencias repetidas; (2) genera factura de Juan con IVA y borrador desde admin@streatlab.com, y para un PDF 9392 factura de David desde davidsanzn@gmail.com; (3) nada se envía sin pulsar "Enviar".

## T18 · Métricas por repartidor, vehículo y ruta
- Tabla `asignaciones_vehiculo` (repartidor, furgoneta, vigente_desde, vigente_hasta) y `rutas` (código de ruta = cliente/destino de Cade: CONSUM-0651-ONTINYENT, SUPECO-ONTINYENT, MYM-0017-ONTINYENT…; alias editable).
- Vistas: `v_entregas_dia` (código, repartidor, furgoneta vigente, ruta, fecha, entregas, kilos, base, complemento, incidencias) y agregados semana/mes.
- Pantalla `Entregas` (= T12) con tres pestañas: **Repartidores · Vehículos · Rutas**. En cada una: entregas/día, entregas/semana, € por entrega, % garantía, incidencias, kilos; comparación con semana y mes anterior; ranking. Selector Semana/Mes.
- Margen por repartidor: facturado por su código − (nóminas + SS + extras + adelantos del mismo mes, por `conciliacion`) − coste de su furgoneta (leasing/préstamo + seguro + recargas prorrateadas). Vista `v_margen_repartidor`.
DoD: (1) con `972.pdf` cargado, Juan muestra 267 entregas, 10,7/día, 55% garantía; (2) ruta CONSUM-0651 concentra la mayoría de entregas; (3) cero datos TEST.

## T12 · Entregas (se construye sobre T18) — ver TREN-david.md, DoD igual.

## T16 · Portal del empleado (mecanismo copiado de Binagre)
Referencia de lectura en Binagre: `usuarios_erp.empleado_id`, `permisos_erp`, `src/lib/permisos/*`, el Portal del empleado. Copiar el mecanismo (rol + permisos por pantalla + vinculación a ficha), no las pantallas de cocina.
- `usuarios` gana `rol` (admin | repartidor) y `empleado_id` → `equipo`/`conductores`. Repartidores: David, Juan, Joel, Saad (+ Jose/Alexis/Fredy si Rubén los da de alta). Entran con el mismo acceso de T1 (Google, enlace mágico, PIN/huella).
- Pantallas del repartidor (solo las suyas, filtradas por `empleado_id`): **Mi semana** (entregas, incidencias, kilómetros), **Kilómetros** (T17), **Mi furgoneta** (checklist de daños con foto), **Mis documentos** (lo que admin le comparta), **Avisos**. Nada de dinero, nóminas de otros, bancos ni facturación.
- Admin: todo + pantalla `Configuración ▸ Permisos` para dar/quitar pantallas por persona (como en Binagre).
DoD: (1) Joel entra y solo ve sus 5 pantallas con sus datos; (2) admin le quita "Mi furgoneta" y desaparece al momento; (3) un repartidor no puede abrir ninguna ruta de admin ni por URL.

## T17 · Kilómetros obligatorios con foto y OCR
- Tabla `kilometros` (empleado, furgoneta, fecha, momento `inicio_semana`|`fin_semana`, km_ocr, km_confirmado, foto_url, confianza, estado).
- Obligación: **lunes (inicio) y domingo (fin)**; mientras falte el registro de la semana, al entrar el repartidor ve la pantalla de Kilómetros y no puede pasar a otra (bloqueo suave con aviso claro).
- Flujo: foto del cuentakilómetros desde el móvil → OCR en función Supabase `km-ocr` (usar el mismo proveedor que Binagre si existe; si no, Gemini Vision con clave en `robot_credenciales`) → propone la cifra → el repartidor confirma o corrige → admin ve lectura, foto y diferencia.
- Reglas: km de la semana = fin − inicio; si la cifra baja respecto a la anterior o salta > 2.000 km, se marca `revisar`. Coste por km = (recargas + mantenimiento + seguro + leasing prorrateado) / km. Se cruza con T18 (km por entrega y por ruta).
- Aviso WhatsApp a Rubén (Green API ya dada de alta) el lunes y el domingo a las 21:00 con quién no ha registrado.
DoD: (1) una foto real del cuentakilómetros da la cifra correcta o un error claro; (2) sin registro, el repartidor no puede navegar; (3) admin ve km semanales por furgoneta y coste por km.

## LOG
