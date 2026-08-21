---
description: Ejecuta una mision definida en docs/misiones/MISION-<nombre>.md
---
PASO 0 (siempre, antes de nada): situate en master y actualiza:
git checkout master && git pull origin master

Despues lee el archivo docs/misiones/MISION-$ARGUMENTS.md y ejecutalo como manager.

REGLA CERO - AUTOLOOP AL 100%, SIN PARAR NUNCA:
- La mision se ejecuta ENTERA de una sola vez: desde la primera fase hasta el INFORME final, sin devolver el turno al usuario en ningun momento intermedio.
- PROHIBIDO terminar el turno, resumir avances o quedarse en silencio antes de que exista docs/misiones/INFORME-$ARGUMENTS.md.
- PROHIBIDO preguntar, pedir confirmacion, sugerir "continuo?" o esperar aprobacion. Ni una sola vez. El usuario NO va a responder.
- Al acabar una fase se ENCADENA la siguiente de forma inmediata y automatica. Terminar una fase no es terminar la mision.
- Si aparece una duda, una ambiguedad o falta un dato: elegir la opcion mas conservadora, anotar la decision en el CHECK y SEGUIR. Jamas frenar por una duda.
- Si una tarea es imposible: marcarla como BLOQUEADA con el motivo en el CHECK y SEGUIR con la siguiente. Una tarea bloqueada nunca detiene la mision.
- Si el contexto se agota: guardar estado en el CHECK, compactar y reanudar solo por la primera fase no completada. Nunca reempezar ni abandonar.
- La mision solo se considera terminada cuando TODAS las fases estan cerradas en el CHECK, el INFORME existe y el trabajo esta commiteado.

EXCEPCION UNICA A LA REGLA CERO (unica razon legitima para parar):
- El trabajo destruiria codigo existente que la mision no contempla (el remoto tiene avances no previstos).
- Falta una decision de negocio de Ruben: coste, alcance, borrado de datos, servicios de pago.
- Faltan credenciales o permisos que no existen.
En esos casos: una linea con el motivo y que se necesita. Nada mas.

REGLA DE ENTREGA:
- Destino: rama master. Un unico push al final con todo (codigo + CHECK + INFORME).
- PROHIBIDO hacer pushes intermedios durante la mision.
- PROHIBIDO ejecutar `npx vercel --prod`. El deploy lo lanza Ruben al final del dia cuando avisa que se va a descansar.

AISLAMIENTO BINAGRE <-> DAVID (innegociable):
Al portar codigo desde C:\streatlab-erp (Binagre, SOLO LECTURA, nunca commitear ahi):
- Tokens #B01D23 #1e2233 #e8f442 #484f66 -> tokens Marino+Fuego de src/styles/tokens.ts
- Uber Eats / Glovo / Just Eat / Web / Directa -> Cade / Prior / Portes
- escandallo / EPS / recetas / platos / marcas / mermas -> ELIMINAR, no traducir
- Supabase eryauogxcpbgdryeimdq -> idclhnxttdbwayxeowrm
Tras cada port, grep obligatorio para confirmar que no queda rastro del origen. Si queda, la fase no esta cerrada.

MODELO DE NEGOCIO DAVID (no inventar nunca):
- Ingresos: Cade (2-3 al mes, llega agrupado en banco), Prior (cada 15 dias, David factura y Prior le devuelve el IVA porque David esta en modulos), Portes (ocasionales por cuenta propia).
- Gastos en 4 grupos: RRHH / Vehiculos (prestamos de cuota fija, NO renting) / Recargas electricas (variable diario) / Controlables (todo lo que no sea los tres anteriores).
- NO existe: renting, canales delivery, marketing, alquiler de local, materia prima.

Reglas obligatorias:
1. Rama master como destino. PROHIBIDO publicar sin que Ruben escriba "publica".
2. Autoloop: sin pausas ni preguntas. Decidir y apuntar en el checklist.
3. Lanza un subagente por tarea segun define la mision, con modelo haiku. Si un subagente falla 2 veces la misma tarea, relanza SOLO esa tarea con sonnet. Nunca opus.
4. ANTI-BLOQUEO: nunca quedarse esperando a un subagente. Si uno no reporta en tiempo razonable, relanzarlo y seguir con el resto en paralelo.
5. Cada subagente recibe SOLO sus archivos asignados y reporta en maximo 10 lineas.
6. Manten docs/misiones/CHECK-$ARGUMENTS.md actualizado tras cada paso (reanudable), commiteado EN LOCAL, sin push.
7. Antes de marcar cualquier tarea como hecha, verifica el criterio objetivo (npx tsc --noEmit con 0 errores + greps reales, no confianza).
8. REANUDACION: si el CHECK ya existe, no repitas lo verificado; arranca en la primera fase no cerrada.
9. Al terminar TODAS las fases: escribe docs/misiones/INFORME-$ARGUMENTS.md (max 30 lineas) y haz el push unico.
10. No explores el repo fuera de los archivos listados en la mision.
11. Supabase David: RLS siempre `FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)`. La app usa PIN propio, no Auth nativo. Si se pone solo `authenticated`, todo devuelve 401.

BLOQUE FIJO AL FINAL DEL INFORME (obligatorio, 3 lineas exactas):
- a la primera: SI / NO  (SI = ninguna tarea necesito escalada a sonnet ni reintento)
- tareas con reintento: <numero>
- error repetido de misiones anteriores: <cual, o "ninguno">
