-- T5 · Cartero: bucket privado de adjuntos y cron 05:00 Madrid todo el año
insert into storage.buckets (id, name, public) values ('correo', 'correo', false) on conflict (id) do nothing;
create policy correo_leer_autenticados on storage.objects for select to authenticated using (bucket_id = 'correo');
select cron.schedule('correo-cartero-diario', '0 3,4 * * *', $$
  select net.http_get(url:='https://rribmludsuirmyprfkop.supabase.co/functions/v1/correo-cartero?llave=david-correo-2026', timeout_milliseconds:=120000)
  where extract(hour from now() at time zone 'Europe/Madrid') = 5;
$$);
