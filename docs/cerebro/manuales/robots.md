# Manual · Robots y avisos (David Reparte)
Fuente de verdad: lo desplegado en Supabase. Copia y tabla completa en `supabase/functions/README.md`.

## Qué corre solo
- Noche (hora de Madrid): correo de David 05:00 · correo de Juan 05:05 · banco 05:10 · saldos 05:20 · casar cobros 05:30.
- Mañana: aviso de documentación de Cade (días 1-10) · aviso de robots por WhatsApp 09:15 (8:15 en invierno) · factura de Prior días 1 y 16.
- Cada minuto, solo si hay liquidaciones pendientes: lector de liquidaciones de Cade.

## Cómo saber si van bien
- Tablas `robot_salud` (último estado) y `robot_log` (historial). La pestaña Hoy avisa si un robot lleva 2 días parado o una conexión bancaria caduca pronto.
- Avisar a Rubén sin que lo pida: robot parado (banco, cartero, saldos).

## Avisos de WhatsApp
- Envío por Green API (credencial en `robot_credenciales`, nunca en el código ni en el chat).
- Destinos en `avisos_whatsapp`, con temas: Rubén «todo»; David solo «facturas». Añadir a alguien nuevo: preguntar antes a Rubén.

## Si hay que tocar un robot
1. Leer lo desplegado (no fiarse solo de la copia del repo).
2. Cambiar, desplegar y probar con una llamada real; mirar la respuesta.
3. Actualizar la copia del repo y el README. Las llaves no se guardan en el repo.
