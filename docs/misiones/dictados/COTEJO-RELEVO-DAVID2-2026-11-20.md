# Cotejo de relevo DAVID_2 → DAVID_3

- Fecha: 20-nov-2026
- Sesión leída: session_01BRB4rnsvKLiY8z3Yp6Ltoi (DAVID_2), entera, del 16-nov 12:12 al 20-nov 08:35 (paginada hasta el inicio).
- Mensajes escritos por Rubén (texto humano, origen móvil): 13. Se excluyen el mensaje semilla de DAVID_1, avisos del sistema, mensajes de otras sesiones y resultados de herramientas.
- Limitación: respuestas de Rubén dadas con botones (no texto) no salen en este filtro.
- Revisado: libreta, tablero, incidencias, manuales (equipo-david, facturacion, robots, flota-y-gente), CLAUDE.md del Cerebro y CLAUDE.md raíz; base de David (solo SELECT).

| # | Fecha | Punto de Rubén | Dónde está guardado | Estado |
|---|---|---|---|---|
| 1 | 16-nov 22:52 | «1 a 2 igual que resto de chats» (relevo 55 % guarda / 60 % pregunta) | libreta Decisiones (16-nov Relevo 55/60); CLAUDE.md del Cerebro art. 20 | OK |
| 2 | 17-nov 16:50 | Partir el turno en 2: hoy 1.500 € por 6 días, jornada completa; turnos 9-15 y 16-20; coste y Seguridad Social | libreta, sección «Análisis turnos partidos» | OK |
| 3 | 17-nov 16:51 | Convenio de supermercados de Alicante, puesto repartidor | libreta (análisis turnos: manda el SMI) | OK |
| 4 | 17-nov 16:53 | Cuánto pagar por turno a cada uno y coste de Seguridad Social | libreta (bruto/neto/SS/coste por turno, total 3.400 €/mes) | OK |
| 5 | 17-nov 16:54 | Con convenio de transporte de mercancías de Alicante | libreta (~1.533 €/mes, 14 pagas, sin verificar) | OK |
| 6 | 17-nov 16:55 | Con convenio de supermercado | libreta (igual que punto 3) | OK |
| 7 | 17-nov 16:57 | Copiar solo la tabla y enviarla por WhatsApp a David y a Rubén | libreta («cifras enviadas por WhatsApp a Rubén y David»); avisos_whatsapp en base: Rubén «todo», David «facturas», ambos activos | OK |
| 8 | 17-nov 17:02 | Salario mínimo 1.286 € en 14 pagas: ¿neto o bruto? | libreta (1.286 × 14, bruto, 18.004 €/año, sin verificar en BOE); pendiente en tablero n.º 3 y manual flota-y-gente | OK |
| 9 | 17-nov 17:07 | Recalcular: una persona 9-15 y otra 15-20; otro 9-15 y 16-21 | libreta (turnos 6 h + 5 h con SMI 1.286; tabla antigua de 2.935 € marcada como desfasada) | OK |
| 10 | 17-nov 17:07 | «Sí» (confirmación del cálculo y envío) | libreta (tabla enviada = «última tabla enviada») | OK |
| 11 | 19-nov 23:32 | «Arregla 10 pendientes prioritarios… de 0 a 100, sin dudas ni pausas, trae ok de hecho» | libreta línea 19/20-nov; tablero t09h-t15h; incidencia 20-nov (lote 7 cerrados) | OK |
| 12 | 19-nov 23:34 | «Arregla 30 pendientes… tareas sin bloqueo» | libreta 20-nov 01:30 (salieron 6 reales, t16h-t21h); incidencia 20-nov (30 pedidos, 6 reales) | OK |
| 13a | 20-nov 08:32 | «Sí» al relevo (Z_10 lo sitúa el 20-nov 09:32 hora de España) | libreta tiene «Vamos por aquí (DAVID_2 → relevo, 20-nov)» pero NO anota que Rubén dijo Sí ni la hora | FALTA |
| 13b | 18-nov (regla vía Z_10, orden de Rubén) | Relevo: dejar el enlace del chat nuevo arriba de la libreta y en el último mensaje | regla copiada en manuales/equipo-david.md. El enlace de la libreta (arriba) sigue apuntando a DAVID_2 (puesto el 18-nov), no a DAVID_3 | FALTA (se puede poner solo cuando el Portero cree DAVID_3) |

Comprobaciones en la base de David (solo SELECT, el 20-nov):
- avisos_whatsapp: Rubén (todo, activo), David (facturas, activo). Coincide con libreta y CLAUDE.md raíz.
- configuracion cade_%: ciclo «11 al 20 del mes siguiente» y día límite 20, cargado del banco. Coincide con libreta/tablero («sin confirmar»).
- cron.job: factura-prior-quincenal 30 7 1,16 (8:30 hora de España en invierno) y aviso-robots-diario 15 7 activos. Coincide con la libreta.

Notas que no son huecos: no hay PINs, claves ni teléfonos nuevos en este informe. El cotejo de 18-nov (DAVID_1 y DAVID_2) ya está en incidencias.

VEREDICTO: FALTAN 2
- 13a: falta anotar el «Sí» de Rubén al relevo del 20-nov.
- 13b: falta el enlace de DAVID_3 arriba de la libreta (depende de que el Portero cree el chat).


## Actualización (DAVID_2, 20-nov)
- Punto 1 (Sí de Rubén al relevo): guardado en libreta, Decisiones de Rubén.
- Punto 2 (enlace de DAVID_3): no puede existir hasta que el Portero cree el chat; se pondrá arriba de la libreta y en el último mensaje a Rubén en cuanto Z pase el enlace.
- VEREDICTO FINAL: TODO GUARDADO salvo el enlace de DAVID_3 (depende del Portero).

## Cierre (DAVID_3, 20-nov)
- Enlace de DAVID_3 puesto arriba de la libreta: https://claude.ai/code/session_01BRB4rp7FmsFxoC9WjkREEZ
- VEREDICTO: TODO GUARDADO.
