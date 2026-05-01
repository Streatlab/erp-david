# /batch-fix — Skill (David)

Agrupa multiples fixes pequenos en una sola spec.

## Cuando usar
3+ fixes del mismo modulo. Maximo 5 por batch.

## Beneficio
1 build + 1 deploy en vez de N. Ahorro 80% tiempo.

## Pipeline
pm-spec agrupa -> implementer paraleliza -> qa-reviewer valida conjunto -> integrator 1 commit -> qa-visual valida cada uno.
