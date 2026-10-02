-- T11 · Flota: vínculo de mantenimientos y daños con el gasto del banco
alter table public.furgonetas_mantenimientos_hist add column if not exists conciliacion_id uuid unique references public.conciliacion(id) on delete set null;
alter table public.furgonetas_incidencias add column if not exists conciliacion_id uuid unique references public.conciliacion(id) on delete set null;
