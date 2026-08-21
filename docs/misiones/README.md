# Misiones ERP David

Carpeta de trabajo del sistema de misión autoloop.

- `MISION-<nombre>.md` — definición de la misión (fases, archivos, criterios de éxito)
- `CHECK-<nombre>.md` — estado reanudable, se actualiza tras cada fase
- `INFORME-<nombre>.md` — informe de cierre, máximo 30 líneas

## Cómo se lanza

**Claude Code:** `/mision <nombre>` → usa `.claude/commands/mision.md` (subagentes, ramas, build local)

**Claude chat:** `/mision-chat <nombre>` → usa `.claude/commands/mision-chat.md` (contenedor + conector GitHub)

## Cuál usar

| Tipo de trabajo | Herramienta |
|---|---|
| Módulo de criterio, lógica de negocio, pantalla suelta, SQL | Claude chat |
| Port masivo desde Binagre (>50KB o >8 archivos) | Claude Code |
| Auditoría o reforma de módulo entero | Claude Code |
| Migración masiva de archivos | Claude Code |

Regla: si la misión requiere que el contenido de Binagre pase por la ventana de contexto del chat y supera ~50KB, va a Claude Code. Nunca empezar en el chat un port que se va a quedar a medias.

## Estado de capacidades verificado (22 ago 2026)

Claude en el chat puede, sobre este repo:
- Clonarlo (`erp-david` es público)
- Instalar dependencias y ejecutar `npx tsc --noEmit` y `npm run build` → verificación real, no confianza
- Escribir y commitear archivos por el conector GitHub

No puede:
- Clonar `binagre` (es privado; solo lectura archivo a archivo por el conector)
- Acceder a Supabase David por MCP (organización distinta a Streat Lab; pendiente de resolver)
