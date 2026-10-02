-- T2 · Robot bancario: cuentas personales, interruptor Descargar, cuenta de origen y cron 05:10 Madrid
insert into public.categorias_contables_gastos (codigo, nombre, tipo, grupo, orden, iva_pct, iva_estimado, ambito)
select 'pendiente-personal-gasto', 'Pendiente revisar (personal)', 'pers', 'Pendiente', 997, 0, true, 'personal'
where not exists (select 1 from public.categorias_contables_gastos where codigo = 'pendiente-personal-gasto');
insert into public.categorias_contables_ingresos (codigo, nombre, canal_abv, orden, ambito)
select 'pendiente-personal-ingreso', 'Pendiente revisar (personal)', 'Personal', 998, 'personal'
where not exists (select 1 from public.categorias_contables_ingresos where codigo = 'pendiente-personal-ingreso');

alter table public.cuentas_bancarias alter column descargar set default true;
alter table public.cuentas_bancarias alter column personal set default false;
alter table public.cuentas_bancarias add column if not exists cobro_via_juan boolean not null default false;
update public.cuentas_bancarias set descargar = true where descargar is distinct from true;

alter table public.conciliacion add column if not exists cuenta_origen text;

select cron.unschedule('banco-sync-diario');
select cron.schedule('banco-sync-diario', '10 3,4 * * *', $$
  select net.http_get(url:='https://rribmludsuirmyprfkop.supabase.co/functions/v1/banco-sync?llave=david-banco-2026', timeout_milliseconds:=120000)
  where extract(hour from now() at time zone 'Europe/Madrid') = 5;
$$);
