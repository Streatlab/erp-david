# CLAUDE.md — David Reparte ERP

## Proyecto
ERP web de David Reparte. Proyecto SATÉLITE separado de Streat Lab.
David = autónomo subcontratista de Cade que reparte para Mercadona, Carrefour, Lidl, Día en Alcoi y Ontinyent.
Flota: 4 furgonetas eléctricas. Personal: 3 fijos + extras.

## Stack
- Next.js + Supabase + Tailwind v4 + Vercel
- URL prod: https://davidparte.vercel.app
- Default branch: master
- Path local Rubén: C:\erp-david
- Supabase ID: idclhnxttdbwayxeowrm (AISLADO del de Binagre)

## Usuarios
- Rubén: 2056
- David: 0604

## Aislamiento absoluto Binagre ↔ David
NUNCA tocar repo Streatlab/binagre, su Supabase ni sus tokens (#B01D23, #1e2233, #e8f442) desde aquí.
Si una tarea menciona Binagre, Streat Lab, dark kitchen, escandallo, marcas virtuales, Uber Eats/Glovo/Just Eat, Rushour, Think Paladar → STOP.

## Design tokens canónicos — Marino+Fuego Mediterráneo
- Marino: #16355C (60%)
- Naranja Valencia: #F26B1F (10% acento)
- Arena cálida: 30% base
- Regla 60/30/10
Archivos master: src/styles/tokens.ts, src/styles/design-tokens.css, DESIGN-SYSTEM.md

## Estado actual
Conciliación + Bancos copiados desde Binagre, en proceso de adaptación a tokens Marino+Fuego.
Migración pendiente de tokens SL antiguos (theme.T, theme.fonts) al sistema David.

## Cadena git+vercel obligatoria
git add . && git commit -m "..." && git push origin master && npx vercel --prod && git pull origin master

## Pipeline
.claude/agents/ → 4 subagentes: pm-spec, architect-review, implementer, qa-reviewer
.claude/plans/ → spec.md, adr.md, tasks.md, summary.md por fix activo
.claude/rules/ → reglas duras (aislamiento, tokens, deploy)

## Comunicación con Rubén
Modo corto por defecto. Listas numeradas. Sin preámbulo. Confirmaciones de una línea.
