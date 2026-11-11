# Cerebro David Reparte — Constitución (v0.1, borrador)

> Versión 0.1 construida SOLO con lo que ya existe en este repo (CLAUDE.md raíz, docs/MAPA-CONTEXTO.md, .claude/rules). Pendiente de contrastar con la constitución modelo de Binagre (no se pudo leer; ver tablero #1).

## 1. Qué es David
- Autónomo subcontratista de Cade. Reparte para Mercadona, Carrefour, Lidl y Día en Alcoi y Ontinyent.
- Cliente único: Cade. Ciclo de pago de Cade: vive en la tabla `configuracion` (editable en Liquidaciones); no se asume en código.
- Rentabilidad: por supermercado y por ruta. Flota: furgonetas eléctricas (3 fijos + extras).
- Repartidores y códigos Cade: ver `docs/MAPA-CONTEXTO.md` (fuente de verdad).

## 2. Aislamiento (innegociable)
- Este Cerebro es solo de David. Nada de Binagre/Streat Lab, Delasalud ni Ben Menjat: ni código, ni Supabase, ni diseño, ni datos.
- Supabase de David: `rribmludsuirmyprfkop`. Ningún otro.
- Plantilla común del Cerebro (forma de trabajar) = estructura de carpetas y protocolos. El contenido siempre es propio.

## 3. Forma de trabajar (común a todo el ecosistema)
1. Constitución (este archivo) · Manuales (`manuales/`) · Libreta (`libreta.md`) · Tablero (`tablero.md`) · Incidencias (`incidencias.md`) · Protocolos (`protocolos.md`).
2. Un módulo por sesión. Lecturas quirúrgicas. Ediciones dirigidas.
3. Todo commit a la rama `trabajo`. Nunca a master. Publicar (merge) lo hace solo Rubén.
4. Agrupar cambios: 1-3 commits por sesión (Vercel cobra por build).
5. Gate antes de commit: `npx vitest run` · `npx tsc -b` · `npm run build`.
6. Datos solo reales o verificados (seguros, ITV, empleados). Lo «Mockup» no cuenta como real.
7. Pendientes vivos: Notion «99 Claude», track DAVID-ERP (ACTIVO / EN_CURSO / PARADO / RESUELTO). Resumen en `tablero.md`.

## 4. Comunicación con Rubén
- No programa. Español de España. Respuestas cortas. Opciones A/B/C y última línea «Recomendada: …».
- Formato: «Hecho: X» / «Resultado: X» / «Pendiente tuyo: X». Cero código, archivos o SQL en el chat.
- Ejecutar sin pedir permiso; preguntar solo ante bloqueo real (1 pregunta).

## 5. Diseño
- Kit Marino + Fuego Mediterráneo, regla 60/30/10, sin rojos en gráficos. Tokens en `src/styles/`. Sin hex en componentes.

## 6. Cierre de sesión
Un commit a `trabajo` · tablero y Notion al día · reporte «Hecho · Pendiente tuyo».
