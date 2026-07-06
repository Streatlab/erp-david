# CLAUDE.md — ERP David Reparte

## Contexto mínimo
- ERP React/TypeScript/Vite. Vercel: proyecto "davidparte" (davidparte.vercel.app). Ignorar proyecto duplicado "erp-david" en Vercel.
- Supabase propio de David: idclhnxttdbwayxeowrm (conector MCP "Supabase David"). NUNCA usar el Supabase de Binagre.
- David: autónomo subcontratista de Cade, reparte para Mercadona/Carrefour/Lidl/Día en Alcoi y Ontinyent.
- El usuario NO es programador. Todo se ejecuta vía herramientas, nunca se le pide código, SQL ni prompts.

## Git y deploy (obligatorio)
1. TODO commit va a la rama `trabajo`. PROHIBIDO commitear a la rama principal.
2. Publicar a producción (merge) lo hace SOLO el usuario, nunca Claude.
3. Vercel cobra por build: agrupar todos los cambios de la sesión en 1 commit. Objetivo 1-3 commits/sesión.
4. Tras publicar el usuario, verificar estado en Vercel (1 sola verificación) y reportar READY o fallo.

## Verificación antes de commitear (obligatorio)
- Comprobar tipos y build localmente cuando haya entorno: `npx tsc --noEmit` y `npm run build`.
- Sin entorno local: revisar mentalmente imports, tipos y JSX del fragmento tocado antes del commit. Un build roto = build de Vercel desperdiciado.

## Comunicación (obligatorio)
1. Respuestas máx 3-4 líneas. Sin preámbulos, sin postambles, sin recapitulaciones.
2. Prohibido narrar: nunca "voy a", "déjame", "estoy revisando", ni anunciar herramientas.
3. Formato único: "Hecho: X" / "Resultado: X" / "Pendiente tuyo: X" / "Falla X. Alternativa: Y".
4. Cero código en chat. Cero nombres de archivos, funciones, tablas, hex, commits (salvo valor de negocio directo).
5. No pedir permisos ni confirmaciones: ejecutar. Preguntar SOLO ante bloqueo real (1 pregunta, 1 línea).
6. Si el usuario dice "silencio" o "corta": modo silencio total inmediato.

## Protocolo token-cero (obligatorio)
1. Lecturas quirúrgicas: solo la sección/función que se toca. NUNCA leer repo completo ni archivos enteros si basta un fragmento.
2. Ediciones dirigidas (reemplazos puntuales). Nunca reescribir archivos completos.
3. Un módulo por sesión. No tocar módulos no relacionados.
4. No releer módulos congelados (registro en Notion).
5. Antes de explorar repo o Supabase: consultar el mapa de contexto cacheado en Notion "99 Claude".
6. Agrupar llamadas a herramientas en un solo turno cuando sea posible.
7. Al saturar contexto: volcar estado a Notion "99 Claude" antes de perder información.

## Mapa de módulos (orientarse SIN explorar el repo)
- Flota (furgonetas): en rediseño — eliminar cards "Furgonetas activas" y "Alertas priorizadas"; cada elemento clicable navega a su detalle: seguro (póliza, contacto, coberturas, PDFs póliza/condiciones/recibo, precio recibo, fecha pago), conductor (ficha completa empleado), ITV (fecha, taller, último informe).
- 6 módulos mapeados desde Binagre pendientes de adaptar: facturas+OCR · liquidación Cade · rentabilidad por supermercado/ruta · conciliación bancaria · dashboard KPI · importación extractos. Orden de arranque: pendiente de decisión del usuario.
- Documentación contaminada de Binagre en este repo: pendiente de limpieza.
- Drive David: carpeta "00 CORRECAMINOS" (subcarpetas: pólizas seguros, ITV, empleados, fotos furgonetas). IDs en Notion 99 Claude.
- Mantener este mapa actualizado.

## Errores ya cometidos — PROHIBIDO repetir
1. Commitear a la rama principal (dispara build de producción).
2. Un deploy por microajuste.
3. Mezclar cualquier cosa de Binagre/Streat Lab en este repo (repos, Supabase, tokens, docs).
4. Inventar datos: solo datos reales o fuentes verificadas, especialmente en seguros, ITV y empleados.

## Reglas de negocio críticas
1. Cliente único: Cade. Ciclo de pago de Cade: PENDIENTE de confirmar por el usuario — no asumir nada hasta entonces.
2. Reparto para Mercadona, Carrefour, Lidl y Día en Alcoi y Ontinyent: la rentabilidad se mide por supermercado y por ruta.
3. Diseño: kit Marino+Fuego Mediterráneo, regla 60/30/10, sin rojos en gráficos.

## Pendientes (Notion "99 Claude")
- Track: DAVID-ERP. Estados: ACTIVO / EN_CURSO / PARADO / RESUELTO.
- Fix nuevo → tarea ACTIVA. Al empezar → EN_CURSO. Al cerrar → RESUELTO.

## Definición de TERMINADO (checklist de cierre de sesión)
1. Todos los cambios en 1 commit a `trabajo`.
2. Notion 99 Claude actualizado (track DAVID-ERP, estados realistas).
3. Reporte final: "Hecho: X · Pendiente tuyo: Y" (Y = publicar merge si aplica).

## Aislamiento absoluto
- Este repo = David Reparte. JAMÁS mezclar con Binagre / Streat Lab: ni repos, ni Supabase, ni design tokens, ni lógica de negocio.
