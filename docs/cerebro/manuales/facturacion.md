# Manual · Facturación (David Reparte)
Solo lo comprobado en la base de David (`rribmludsuirmyprfkop`) a 19-nov-2026.

## Quién factura a quién
- Emisores: DAVID y JUAN (`config_emisores`). Numeración propia de cada uno, por año, sin serie.
- Cliente CADE: reparto a domicilio. Códigos Cade → repartidor: 9392 David · 939 Joel · 9391 Saad · 972 Juan. Desde 1-sep-2026 David factura solo 9392 y Juan 972/939/9391.
- Cliente MUESTRARIOS (Muestrarios y Revisados Prior SL): traslado de mercancías, emisor Juan, 4 servicios × 600 € + 21 % IVA = 2.904 € cada quincena.

## Factura de Cade (mensual)
1. Llega la liquidación de Cade por correo (robots cartero) o se sube a mano.
2. El lector de liquidaciones la cuadra, detecta cargos y crea la factura y el borrador de envío. Nunca envía solo.
3. Rubén revisa y envía desde Facturación.
4. Cobro: el banco lo casa solo (`casar_cobros`, ±1 €, 15 días).

## Factura de Prior (automática)
- Robot `factura-prior`, días 1 y 16 a las 8:30 (9:30 en verano). Día 16 → fecha 15; día 1 → último día del mes anterior.
- Coge el nº siguiente de Juan, la deja PENDIENTE, guarda el PDF, crea tarea en Hoy y avisa por WhatsApp (PDF a Rubén, texto a David).
- No duplica: si ya existe la factura de esa fecha, no hace nada. Si falla, WhatsApp de aviso a Rubén.
- Rubén a veces emite facturas fuera del ERP: antes de facturar a mano, mirar el último nº de Juan en Facturación.

## Ciclo de pago de Cade
- Visto en el banco (ene–oct 2026): paga cada mes entre el día 11 y el 20 del mes siguiente. Guardado en Liquidaciones Cade como «pendiente de confirmar por Rubén», con día límite 20.

## Prohibido
- Cambiar facturas, liquidaciones o cierres ya cerrados (constitución 4d).
- Facturas Juan 16-17 de Muestrarios (octubre) chocan de número con las 16-18 de Cade: Rubén decidió dejarlas (16-nov).
