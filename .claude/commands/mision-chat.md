---
description: Sistema de misión autoloop para Claude en el chat (no Claude Code). Ejecuta docs/misiones/MISION-<nombre>.md de principio a fin sin devolver el turno.
---

# /MISION-CHAT · AUTOLOOP DESDE EL CHAT

Adaptación del sistema `/mision` de Binagre a las capacidades reales de Claude en el chat.
Diferencia clave: aquí no hay subagentes ni ramas locales. Hay contenedor Linux + conector GitHub.

---

## PASO 0 · ARRANQUE (siempre, sin preguntar)

1. Clonar el repo objetivo en el contenedor:
   `git clone --depth 1 https://github.com/Streatlab/<repo>.git`
   (erp-david es público. binagre es privado: solo lectura archivo a archivo por el conector GitHub.)
2. Lanzar `npm install` en segundo plano y seguir trabajando mientras instala.
3. Leer `docs/misiones/MISION-<nombre>.md`.
4. Si existe `docs/misiones/CHECK-<nombre>.md`, arrancar en la primera fase no cerrada. Nunca repetir lo ya verificado.

---

## REGLA CERO · AUTOLOOP AL 100%

- La misión se ejecuta ENTERA en un turno: desde la primera fase hasta el INFORME.
- PROHIBIDO devolver el turno, resumir avances o preguntar "¿sigo?" antes de que exista el INFORME. El usuario no va a responder.
- Al cerrar una fase se encadena la siguiente de forma inmediata. Cerrar una fase no es cerrar la misión.
- Ante duda o dato que falta: elegir la opción más conservadora, anotarla en el CHECK y SEGUIR. Jamás frenar por una duda.
- Si una tarea es imposible: marcarla BLOQUEADA con el motivo en una línea y SEGUIR con la siguiente.
- Si el contexto se agota: volcar estado al CHECK, subirlo, y decir en qué fase se reanuda. Nunca reempezar desde cero.

## EXCEPCIÓN ÚNICA A LA REGLA CERO

Se detiene la misión y se devuelve el turno solo si se cumple una de estas:
- El trabajo destruiría código existente que no está en la misión (por ejemplo, el remoto tiene avances que la misión no contempla).
- Falta una decisión de negocio de Rubén: coste, alcance, borrado de datos, contratar algo de pago.
- Las credenciales o permisos necesarios no existen.

En esos casos: una línea con el motivo y qué se necesita. Nada más.

---

## VERIFICACIÓN · SIN CONFIANZA, CON PRUEBAS

Antes de dar una tarea por hecha:
- `npx tsc --noEmit` → 0 errores. Es la verificación mínima innegociable.
- `npm run build` al cerrar cada fase.
- `grep` real para confirmar que los reemplazos se aplicaron (tokens, textos, imports).
- Nunca marcar hecho "porque el código parece correcto".

## AISLAMIENTO BINAGRE ↔ DAVID

Al portar código entre repos, verificar con grep que NO queda rastro del origen:
- Tokens: `#B01D23` `#1e2233` `#e8f442` `#484f66` → tokens Marino+Fuego de David
- Textos: Uber Eats / Glovo / Just Eat → Cade / Prior / Portes
- Dominio: escandallo / EPS / recetas / platos / marcas → eliminar, no traducir
- Supabase: `eryauogxcpbgdryeimdq` → `idclhnxttdbwayxeowrm`

Si un grep encuentra rastro tras el port, la fase no está cerrada.

---

## MODELO DE NEGOCIO DAVID (no inventar nunca)

- **Ingresos:** Cade (2-3 al mes, llega agrupado en el banco), Prior (cada 15 días, David factura y Prior le devuelve el IVA porque David está en módulos), Portes (ocasionales por cuenta propia).
- **Gastos, 4 grupos:** RRHH / Vehículos (préstamos de cuota fija, NO renting) / Recargas eléctricas (variable, diario) / Controlables (todo lo que no sea los tres anteriores).
- **No existe en David:** renting, canales delivery, marketing, alquiler de local, materia prima.

---

## ENTREGA · UN SOLO ENVÍO AL FINAL

- Todo el trabajo se hace en el contenedor. Nada se sube hasta que la misión está cerrada.
- Al final: subir los archivos modificados por el conector GitHub, en tanda única.
- PROHIBIDO `npx vercel --prod`. El deploy lo lanza Rubén cuando dice que se va a descansar.
- PROHIBIDO fusionar a master por iniciativa propia. Publicar es exclusivo de Rubén con la palabra "publica".

---

## CHECK · REANUDABLE

`docs/misiones/CHECK-<nombre>.md` se actualiza tras cada fase, en el contenedor:

```
## FASE 1 · <nombre>  [HECHO | EN CURSO | BLOQUEADA]
- archivos tocados: <lista>
- tsc: 0 errores / N errores
- decisiones tomadas sin preguntar: <lista>
- bloqueos: <motivo o ninguno>
```

## INFORME · MÁXIMO 30 LÍNEAS

`docs/misiones/INFORME-<nombre>.md` al cerrar todas las fases:
- Qué se hizo, por fase, en una línea cada una
- Tablas creadas o migradas en Supabase
- Qué quedó pendiente y por qué
- Qué necesita decisión de Rubén

Bloque fijo al final, 3 líneas exactas:
```
- a la primera: SI / NO
- fases con reintento: <número>
- error repetido de misiones anteriores: <cuál o "ninguno">
```

---

## LÍMITE HONESTO DE ESTE SISTEMA

Este modo sirve para: módulos de criterio, adaptación de lógica de negocio, ficheros sueltos, pantallas, queries, migraciones SQL.

NO sirve para portar módulos enormes desde Binagre (más de ~50KB o más de 8 archivos), porque el contenido tiene que pasar por la ventana de contexto archivo a archivo y se agota antes de terminar.

En ese caso: declararlo en una línea, preparar la misión para Claude Code y seguir con lo que sí es viable aquí. Nunca empezar un port masivo que se va a quedar a medias.
