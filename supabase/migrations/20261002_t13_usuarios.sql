-- T13 · Usuarios: administración de la lista blanca y de los dispositivos (PIN/huella revocables)
alter table public.accesos_pin add column if not exists revocado boolean not null default false;
alter table public.accesos_huella add column if not exists revocado boolean not null default false;
-- acceso_pin_guardar / acceso_pin_comprobar actualizados para ignorar dispositivos revocados (ver t1)
-- es_admin(), usuarios_listado(), usuario_guardar(), usuario_dispositivos(), usuario_reset_dispositivo():
-- security definer, solo administradores activos (comprobado por el correo de la sesión). Aplicadas en Supabase David.
