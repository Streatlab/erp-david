# CLAUDE.md — ERP David Reparte

## Contexto mínimo
- ERP React/TypeScript/Vite. Vercel: proyecto "davidparte" (davidparte.vercel.app). Ignorar proyecto duplicado "erp-david" en Vercel.
- David: autónomo subcontratista de Cade, reparte para Mercadona/Carrefour/Lidl/Día en Alcoi y Ontinyent.
- El usuario NO es programador. Todo se ejecuta vía herramientas, nunca se le pide código, SQL ni prompts.

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

## Deploy (obligatorio)
1. Vercel cobra por build. Agrupar TODOS los cambios de la sesión en 1 commit → 1 deploy. Objetivo: 1-3 deploys/sesión máximo.
2. Nunca 1 build por microajuste.
3. Tras deploy: verificar estado en Vercel (1 sola verificación) y reportar READY o fallo, sin preguntar.

## Diseño
- Kit Marino+Fuego Mediterráneo. Solo datos reales o fuentes verificadas, nada inventado.

## Aislamiento absoluto
- Este repo = David Reparte. JAMÁS mezclar con Binagre / Streat Lab: ni repos, ni Supabase, ni design tokens, ni lógica de negocio.
