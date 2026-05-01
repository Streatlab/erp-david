# CLAUDE.md — David Reparte ERP

Este archivo es la Constitución del proyecto. Máx 30 líneas.
Para detalle, ver `.claude/rules/` y `.claude/plans/active-plan.md`.

## Stack
- Next.js + Supabase + Tailwind v4 + Vercel
- URL prod: https://davidparte.vercel.app
- Repo: github.com/Streatlab/erp-david
- Supabase: idclhnxttdbwayxeowrm (AISLADO de Binagre)

## Design tokens (Marino+Fuego Mediterráneo)
- Marino: #16355C
- Naranja Valencia: #F26B1F
- Arena cálida: tokens en src/styles/tokens.ts
- Regla 60/30/10
- Master: src/styles/tokens.ts, src/styles/design-tokens.css, DESIGN-SYSTEM.md

## Aislamiento absoluto Binagre ↔ David
- NUNCA tocar Supabase de Binagre
- NUNCA importar tokens Streat Lab (#B01D23, #1e2233, #e8f442)
- NUNCA mezclar lógica de negocio (escandallo, EPS, marcas virtuales delivery)

## Pipeline obligatorio (ver .claude/plans/active-plan.md)
1. pm-spec → 2. architect-review → 3. implementer (ctx bifurcado) → 4. qa-reviewer → 5. integrator → 6. qa-visual
- Cada etapa produce un archivo en `.claude/plans/`
- Commit antes de cada etapa
- Code NUNCA pregunta a Rubén durante ejecución
