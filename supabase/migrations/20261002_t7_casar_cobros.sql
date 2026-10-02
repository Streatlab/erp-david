-- T7 · Cobros: casar facturas pendientes con ingresos del banco (mismo total ±1 €, 15 días)
alter table public.facturas_emitidas add column if not exists cobro_conciliacion_id uuid unique references public.conciliacion(id) on delete set null;
alter table public.facturas_emitidas add column if not exists cobro_auto boolean not null default false;

create or replace function public.casar_cobros()
returns integer language plpgsql security definer set search_path = public as $$
declare f record; c record; n integer := 0;
begin
  for f in select id, fecha_factura, total from public.facturas_emitidas
           where estado = 'PENDIENTE' and total is not null and fecha_factura is not null
           order by fecha_factura, numero_factura loop
    select id, fecha into c from public.conciliacion m
     where m.importe > 0 and abs(m.importe - f.total) <= 1
       and m.fecha between f.fecha_factura and f.fecha_factura + 15
       and not exists (select 1 from public.facturas_emitidas x where x.cobro_conciliacion_id = m.id)
     order by m.fecha, abs(m.importe - f.total) limit 1;
    if found then
      update public.facturas_emitidas
         set estado = 'COBRADA', fecha_cobro = c.fecha, cobro_conciliacion_id = c.id, cobro_auto = true
       where id = f.id;
      n := n + 1;
    end if;
  end loop;
  return n;
end $$;
revoke all on function public.casar_cobros() from public, anon;
grant execute on function public.casar_cobros() to authenticated, service_role;

select cron.schedule('casar-cobros-diario', '30 3,4 * * *', $$
  select public.casar_cobros() where extract(hour from now() at time zone 'Europe/Madrid') = 5;
$$);
