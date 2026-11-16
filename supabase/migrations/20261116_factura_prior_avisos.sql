-- Factura automática Prior (16-nov-2026)
-- 1) Avisos de WhatsApp por temas: 'todo' (por defecto), 'robots', 'facturas'.
alter table public.avisos_whatsapp add column if not exists temas text[] not null default '{todo}';
-- aviso_robots() solo escribe a destinos con tema 'todo' o 'robots' (función actualizada en la base).
-- 2) David recibe solo avisos de facturas (móvil confirmado por Rubén 16-nov), insertado en la base.
-- 3) Cron: select cron.schedule('factura-prior-quincenal', '30 7 1,16 * *', <llamada a factura-prior con su llave>);
