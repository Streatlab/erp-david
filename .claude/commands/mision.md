---
description: Ejecuta una mision definida en docs/misiones/MISION-<nombre>.md (repo erp-david)
---
AISLAMIENTO ABSOLUTO (regla previa a todo):
- Este repo es Streatlab/erp-david (ERP de David Reparte). NADA de Streat Lab / Binagre.
- PROHIBIDO importar, copiar o referenciar: tokens #B01D23 / #1e2233 / #e8f442, escandallo, EPS, marcas virtuales, dark kitchen, Uber Eats / Glovo / Just Eat, Rushour, Think Paladar.
- Todo lo visual se rige por Marino+Fuego Mediterraneo: src/styles/design-tokens.css, src/styles/tokens.ts, DESIGN-SYSTEM.md, BRAND.md. Regla 60/30/10.
- Si una tarea pide algo que huela a Binagre: marcarla BLOQUEADA en el CHECK y seguir.

PASO 0 (siempre, antes de nada): situate en la rama trabajo y actualiza:
git checkout trabajo && git pull

Despues lee el archivo docs/misiones/MISION-$ARGUMENTS.md y ejecutalo como manager.

REGLA CERO - AUTOLOOP AL 100%, SIN PARAR NUNCA:
- La mision se ejecuta ENTERA de una sola vez: desde la primera fase hasta el INFORME final, sin devolver el turno al usuario en ningun momento intermedio.
- PROHIBIDO terminar el turno, resumir avances o quedarse en silencio antes de que exista docs/misiones/INFORME-$ARGUMENTS.md.
- PROHIBIDO preguntar, pedir confirmacion, sugerir "continuo?" o esperar aprobacion. Ni una sola vez. Ruben NO va a responder.
- Al acabar una fase se ENCADENA la siguiente de forma inmediata y automatica. Terminar una fase no es terminar la mision.
- Si aparece una duda, una ambiguedad o falta un dato: elegir la opcion mas conservadora, anotar la decision en el CHECK y SEGUIR. Jamas frenar por una duda.
- Si una tarea es imposible: marcarla BLOQUEADA con el motivo en el CHECK y SEGUIR con la siguiente. Una tarea bloqueada nunca detiene la mision.
- Si el contexto se agota: guardar estado en el CHECK, compactar y reanudar solo por la primera fase no completada. Nunca reempezar ni abandonar.
- La mision solo se considera terminada cuando TODAS las fases estan cerradas en el CHECK, el INFORME existe y el trabajo esta entregado en la rama trabajo.

REGLA DE ENTREGA - TODO VUELVE SIEMPRE A LA RAMA TRABAJO (innegociable):
- Ninguna mision puede terminar dejando codigo solo en su propia rama (claude/mision-*). Eso es trabajo perdido.
- Cierre obligatorio de toda mision, en este orden:
  1. git checkout trabajo && git pull
  2. fusionar la rama de la mision en trabajo (conflictos a favor de lo mas conservador, anotarlo en el CHECK)
  3. UN unico push a trabajo con todo (codigo + CHECK + INFORME)
  4. verificar con git log que el commit esta en trabajo en el remoto
- Si la fusion falla, reintentar; si es imposible, dejarlo escrito en la primera linea del INFORME como BLOQUEO DE ENTREGA. Nunca terminar en silencio con la rama sin fusionar.
- PROHIBIDO tocar master, fusionar a master o publicar. Publicar es exclusivo de Ruben con la palabra "publica".

REGLA DE PUSH - UNO SOLO:
- PROHIBIDO hacer pushes intermedios durante la mision (ni CHECKs, ni docs, ni avances parciales). Todo se commitea EN LOCAL y viaja en el push final de entrega.
- master despliega a produccion en Vercel: por eso master no se toca nunca desde una mision.

Reglas obligatorias:
1. Rama trabajo SIEMPRE como destino final. PROHIBIDO tocar master, hacer merge a master o publicar.
2. Autoloop: sin pausas ni preguntas. Decidir y apuntar en el checklist.
3. Lanza un subagente por tarea segun define la mision, con modelo haiku. Si un subagente falla 2 veces la misma tarea, relanza SOLO esa tarea con sonnet. Nunca opus.
4. ANTI-BLOQUEO: nunca quedarse esperando a un subagente. Si uno no reporta en tiempo razonable, relanzarlo y seguir con el resto en paralelo.
5. Cada subagente recibe SOLO sus archivos asignados y reporta en maximo 10 lineas.
6. Manten docs/misiones/CHECK-$ARGUMENTS.md actualizado tras cada paso (reanudable), commiteado EN LOCAL, sin push.
7. Antes de marcar cualquier tarea como hecha, verifica el criterio objetivo de la mision (greps/tests reales, no confianza).
8. GATE OBLIGATORIO antes de dar por cerrada la mision: npx tsc -b sin errores y npm run build sin errores.
9. REANUDACION: si el CHECK ya existe, no repitas lo verificado como hecho; arranca en la primera fase no cerrada.
10. Al terminar TODAS las fases: escribe docs/misiones/INFORME-$ARGUMENTS.md (max 30 lineas) y ejecuta la REGLA DE ENTREGA completa.
11. No explores el repo fuera de los archivos listados en la mision.

BLOQUE FIJO AL FINAL DEL INFORME (obligatorio, 4 lineas exactas):
- a la primera: SI / NO  (SI = ninguna tarea necesito escalada a sonnet ni reintento)
- tareas con reintento: <numero>
- gate tsc + build: OK / FALLA
- error repetido de misiones anteriores: <cual, o "ninguno">
