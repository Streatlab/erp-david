-- T1 · Acceso: lista blanca por email + PIN por dispositivo + huella (WebAuthn)
alter table public.usuarios add column if not exists activo boolean not null default true;

create table if not exists public.accesos_pin (
  id bigserial primary key,
  usuario_id integer not null references public.usuarios(id) on delete cascade,
  dispositivo text not null,
  pin_hash text not null,
  intentos integer not null default 0,
  bloqueado_hasta timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (usuario_id, dispositivo)
);

create table if not exists public.accesos_huella (
  id bigserial primary key,
  usuario_id integer not null references public.usuarios(id) on delete cascade,
  dispositivo text not null,
  credential_id text not null unique,
  public_key text not null,
  alg integer not null default -7,
  created_at timestamptz not null default now()
);

create table if not exists public.accesos_retos (
  id bigserial primary key,
  usuario_id integer not null references public.usuarios(id) on delete cascade,
  dispositivo text not null,
  reto text not null,
  expira timestamptz not null default now() + interval '2 minutes'
);

alter table public.accesos_pin enable row level security;
alter table public.accesos_huella enable row level security;
alter table public.accesos_retos enable row level security;
revoke all on public.accesos_pin, public.accesos_huella, public.accesos_retos from anon, authenticated;

-- ¿Este email puede entrar? (para enviar enlace mágico solo a la lista blanca)
create or replace function public.email_autorizado(p_email text)
returns boolean language sql security definer set search_path = public stable as $$
  select exists (select 1 from public.usuarios u where lower(u.email) = lower(trim(p_email)) and u.activo)
$$;
grant execute on function public.email_autorizado(text) to anon, authenticated;

-- Perfil del usuario de la sesión actual (nunca por email arbitrario)
create or replace function public.mi_usuario()
returns table(id integer, nombre text, perfil text, email text)
language sql security definer set search_path = public stable as $$
  select u.id, u.nombre::text, u.perfil::text, u.email
  from public.usuarios u
  where u.activo and u.email is not null and lower(u.email) = lower(auth.jwt() ->> 'email')
  limit 1
$$;
revoke all on function public.mi_usuario() from public, anon;
grant execute on function public.mi_usuario() to authenticated;

create or replace function public.login_google(p_email text)
returns table(nombre text, perfil text)
language plpgsql security definer set search_path = public as $$
begin
  return query
    select u.nombre::text, u.perfil::text from public.usuarios u
    where lower(u.email) = lower(p_email) and u.activo limit 1;
end $$;

-- PIN: solo la función `acceso` (service role) llama a estas dos
create or replace function public.acceso_pin_guardar(p_usuario integer, p_dispositivo text, p_pin text)
returns void language sql security definer set search_path = public as $$
  insert into public.accesos_pin (usuario_id, dispositivo, pin_hash)
  values (p_usuario, p_dispositivo, extensions.crypt(p_pin, extensions.gen_salt('bf')))
  on conflict (usuario_id, dispositivo) do update
    set pin_hash = excluded.pin_hash, intentos = 0, bloqueado_hasta = null, updated_at = now()
$$;

-- Devuelve: ok | incorrecto | bloqueado | sin_pin. Bloquea 15 min tras 5 fallos.
create or replace function public.acceso_pin_comprobar(p_usuario integer, p_dispositivo text, p_pin text)
returns table(resultado text, bloqueado_hasta timestamptz, restantes integer)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare r public.accesos_pin;
begin
  select * into r from public.accesos_pin a where a.usuario_id = p_usuario and a.dispositivo = p_dispositivo for update;
  if not found then return query select 'sin_pin'::text, null::timestamptz, 0; return; end if;
  if r.bloqueado_hasta is not null and r.bloqueado_hasta > now() then
    return query select 'bloqueado'::text, r.bloqueado_hasta, 0; return;
  end if;
  if r.pin_hash = extensions.crypt(p_pin, r.pin_hash) then
    update public.accesos_pin set intentos = 0, bloqueado_hasta = null, updated_at = now() where id = r.id;
    return query select 'ok'::text, null::timestamptz, 5; return;
  end if;
  r.intentos := r.intentos + 1;
  if r.intentos >= 5 then
    update public.accesos_pin set intentos = 0, bloqueado_hasta = now() + interval '15 minutes', updated_at = now() where id = r.id;
    return query select 'bloqueado'::text, now() + interval '15 minutes', 0; return;
  end if;
  update public.accesos_pin set intentos = r.intentos, bloqueado_hasta = null, updated_at = now() where id = r.id;
  return query select 'incorrecto'::text, null::timestamptz, 5 - r.intentos;
end $$;

revoke all on function public.acceso_pin_guardar(integer, text, text) from public, anon, authenticated;
revoke all on function public.acceso_pin_comprobar(integer, text, text) from public, anon, authenticated;
grant execute on function public.acceso_pin_guardar(integer, text, text) to service_role;
grant execute on function public.acceso_pin_comprobar(integer, text, text) to service_role;

-- Con sesión real, el ERP entra como `authenticated`: equipo solo tenía política anon
create policy equipo_auth on public.equipo for all to authenticated using (true) with check (true);
create policy equipo_benef_auth on public.equipo_beneficiarios for all to authenticated using (true) with check (true);
