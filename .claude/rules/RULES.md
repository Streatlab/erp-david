# Reglas duras — David Reparte ERP

## 1. Aislamiento absoluto Binagre ↔ David
- NUNCA tocar repo `Streatlab/binagre` desde este proyecto
- NUNCA usar tokens Streat Lab (`#B01D23`, `#1e2233`, `#e8f442`, `#484f66`) en este código
- NUNCA referenciar Supabase de Binagre
- Si una tarea menciona Binagre, Streat Lab, dark kitchen, escandallo, EPS, marcas virtuales, Uber Eats/Glovo/Just Eat, Rushour, Think Paladar, Emilio → STOP y avisar a Rubén

## 2. Design tokens canónicos — Marino+Fuego Mediterráneo
- Solo usar: `#16355C` (Marino, 60%), `#F26B1F` (Naranja Valencia, 10% acento), Arena cálida (30%)
- Regla 60/30/10: Marino dominante, Arena base, Naranja solo acento
- Archivos master: `src/styles/tokens.ts`, `src/styles/design-tokens.css`, `DESIGN-SYSTEM.md`
- Nunca hardcodear hex fuera de estos archivos

## 3. Cadena de deploy obligatoria
Todo prompt o tarea de fix termina con:
```bash
git add . && git commit -m "..." && git push origin master && npx vercel --prod && git pull origin master
```

## 4. Migración desde patrones Binagre
Conciliación + Bancos fueron copiados de Binagre. Reglas de migración:
- `theme.T.rojo` → `tokens.marino`
- `theme.T.panel` → `tokens.arena`
- `theme.fonts.x` → `tokens.fonts.x` (renombrado)
- `#B01D23` (acento) → `#F26B1F` o `#16355C` (estructural)
- `#1e2233` (sidebar) → `#16355C` Marino
Si encuentras `theme.T` o `theme.fonts` → migrar antes de cualquier otro cambio.

## 5. Negocio
- David reparte para Mercadona, Carrefour, Lidl, Día en Alcoi y Ontinyent
- Flota: 4 furgonetas eléctricas, 3 fijos + extras
- David es autónomo subcontratista de Cade
- Usuarios: Rubén 2056, David 0604

## 6. Pipeline obligatorio para fixes grandes
1. `pm-spec` genera `.claude/plans/spec.md`
2. Rubén aprueba
3. `architect-review` genera `.claude/plans/adr.md` y `tasks.md`
4. Rubén aprueba
5. `implementer` ejecuta y genera `summary.md`
6. `qa-reviewer` valida
7. Push solo si todo pasa

## 7. Seguridad
- Nunca commitear secretos (claves Supabase, PATs)
- Variables sensibles en `.env.local` (gitignored) y en Vercel env vars
