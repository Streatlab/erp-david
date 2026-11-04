# Robots del ERP David (Supabase Edge Functions)

Copia en el repositorio de lo que está desplegado en Supabase (proyecto rribmludsuirmyprfkop). Fuente de verdad: lo desplegado. Este directorio sirve para revisar cambios y volver a desplegar si hace falta.

| Robot | Qué hace | Cuándo corre |
|---|---|---|
| acceso | Entrada rápida al ERP (PIN por dispositivo y huella) | Al entrar |
| banco-auth | Conectar y renovar bancos (Enable Banking) | Manual, desde Bancos y Cuentas |
| banco-sync | Descarga movimientos, aplica reglas y los pasa a Conciliación | Cada noche (cron banco-sync-diario) |
| banco-saldos | Guarda el saldo real de cada cuenta | Cada noche (cron banco-saldos-diario) |
| correo-auth | Permiso de Google para los buzones de David y Juan | Manual |
| correo-cartero | Lee el buzón de David (Gmail) y guarda lo de Cade | Cada noche (cron correo-cartero-diario) |
| correo-imap | Lee el buzón de Juan (IMAP) y guarda lo de Cade | Cada noche (cron correo-imap-juan) |
| liquidacion-parser | Lee el PDF de liquidación de Cade, cuadra, detecta cargos y genera factura y borrador de envío | Cada minuto si hay pendientes (cron liquidaciones-pendientes) |
| factura-pdf | PDF de una factura emitida | Desde Facturación |
| facturas-paquete | Excel + PDF de facturas y relación; ZIP o borrador de correo (nunca envía) | Desde Facturación |
| documentacion-subir | Clasifica los certificados que se suben para Cade | Desde Documentación Cade |
| aviso-documentacion | Correo diario a Rubén si falta documentación (días 1-10) | Cada mañana (cron aviso-documentacion-diario) |

No están copiados aquí (siguen solo en Supabase): `plantillas-montar`, `plantillas-cargar`, `plantillas-prior` (cargas únicas ya ejecutadas; llevan las plantillas Excel con datos fiscales embebidos) y `banco-diag` (diagnóstico puntual).

Las claves y credenciales no están en el código: viven en la tabla `robot_credenciales` (solo accesible por los robots).

## Llaves de acceso
Las funciones que se llaman por URL piden `?llave=`. En el repositorio la llave sale de una variable de entorno (`LLAVE_BANCO`, `LLAVE_CORREO`, `LLAVE_LIQ`, `LLAVE_DOCS`) y no se guarda el valor. Lo desplegado en Supabase lleva la llave real. Antes de volver a desplegar una función desde aquí, crear ese secreto en Supabase con el mismo valor que usan los crons; si falta, la función rechaza todas las llamadas.
