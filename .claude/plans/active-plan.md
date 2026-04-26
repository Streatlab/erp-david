# Active plan — David Reparte ERP

> Este archivo se sobrescribe en cada fix activo. Marca QUÉ se está trabajando ahora mismo.
> Pipeline: pm-spec → architect-review → implementer → qa-reviewer.
> Estado actual: SIN FIX ACTIVO.

## Pendientes David (origen Notion 99 Claude)
Ver track DAVID-ERP en Notion. Abrir cuando se inicie un fix.

## Pendiente principal abierto (al cierre del montaje)
Adaptar 33 archivos copiados desde Binagre (Conciliación + Bancos) a tokens Marino+Fuego.
Migrar todos los `theme.T` y `theme.fonts` al sistema David.

## Cuando arranque un fix
1. pm-spec genera `spec.md`
2. Aprobación Rubén
3. architect-review genera `adr.md` y `tasks.md`
4. Aprobación Rubén
5. implementer ejecuta y genera `implementation-summary.md`
6. qa-reviewer genera `qa-report.md` con veredicto
7. Si veredicto verde → cerrar fix y limpiar `plans/` (mover a `plans/archive/`)
