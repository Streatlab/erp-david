-- ============================================================
-- ERP DAVID — Migration 016: Flota fixes (rediseño)
-- 1. Datos reales conductores (Saad sustituye a Joel en 02)
-- 2. Estado NOT NULL (unifica vs columna 'activa')
-- 3. Tablas hijas: seguros, ITV, fotos, conductores
-- ============================================================

-- 1. Datos reales conductores ─────────────────────────────────
UPDATE public.furgonetas SET conductor='David', nombre_corto='David', matricula='5827 KPN', modelo='Citroën ë-Jumpy',  ruta='Alcoi'     WHERE codigo='01';
UPDATE public.furgonetas SET conductor='Saad',  nombre_corto='Saad',  matricula='3291 LMR', modelo='Citroën ë-Jumpy',  ruta='Ontinyent' WHERE codigo='02';
UPDATE public.furgonetas SET conductor='Pau',   nombre_corto='Pau',   matricula='4728 MXN', modelo='Peugeot e-Expert', ruta='Alcoi'     WHERE codigo='03';
UPDATE public.furgonetas SET conductor='Juan',  nombre_corto='Juan',  matricula='6184 NBV', modelo='Citroën ë-Jumpy',  ruta='Ontinyent' WHERE codigo='04';

-- 2. Estado NOT NULL ──────────────────────────────────────────
UPDATE public.furgonetas SET estado = 'OPERATIVA'      WHERE estado IS NULL AND activa = true;
UPDATE public.furgonetas SET estado = 'FUERA_SERVICIO' WHERE estado IS NULL AND activa = false;
ALTER TABLE public.furgonetas ALTER COLUMN estado SET DEFAULT 'OPERATIVA';
ALTER TABLE public.furgonetas ALTER COLUMN estado SET NOT NULL;

-- 3. Tabla SEGUROS (1 por furgoneta) ──────────────────────────
CREATE TABLE IF NOT EXISTS public.furgonetas_seguros (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  furgoneta_id    uuid NOT NULL UNIQUE REFERENCES public.furgonetas(id) ON DELETE CASCADE,
  compania        text,
  numero_poliza   text,
  telefono        text,
  email           text,
  mediador_nombre text,
  mediador_tel    text,
  coberturas      text,
  franquicia_eur  numeric,
  prima_anual_eur numeric,
  forma_pago      text,
  fecha_proximo_cobro date,
  fecha_renovacion    date,
  drive_poliza_id     text,
  drive_condicionado_id text,
  drive_recibo_id     text,
  notas           text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE public.furgonetas_seguros ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_seguros_all ON public.furgonetas_seguros;
CREATE POLICY p_seguros_all ON public.furgonetas_seguros FOR ALL USING (true) WITH CHECK (true);

-- 4. Tabla ITV (1 por furgoneta, último estado) ───────────────
CREATE TABLE IF NOT EXISTS public.furgonetas_itv (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  furgoneta_id  uuid NOT NULL UNIQUE REFERENCES public.furgonetas(id) ON DELETE CASCADE,
  estacion      text,
  estacion_tel  text,
  ultima_fecha  date,
  ultima_km     int,
  ultima_resultado text,
  proxima_fecha date,
  drive_informe_id text,
  notas         text,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

ALTER TABLE public.furgonetas_itv ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_itv_all ON public.furgonetas_itv;
CREATE POLICY p_itv_all ON public.furgonetas_itv FOR ALL USING (true) WITH CHECK (true);

-- 5. Tabla FOTOS (N por furgoneta) ────────────────────────────
CREATE TABLE IF NOT EXISTS public.furgonetas_fotos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  furgoneta_id  uuid NOT NULL REFERENCES public.furgonetas(id) ON DELETE CASCADE,
  drive_file_id text NOT NULL,
  url_publica   text,
  es_portada    boolean DEFAULT false,
  fecha         date DEFAULT current_date,
  subida_por    text,
  notas         text,
  created_at    timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fotos_furgo ON public.furgonetas_fotos(furgoneta_id);

ALTER TABLE public.furgonetas_fotos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_fotos_all ON public.furgonetas_fotos;
CREATE POLICY p_fotos_all ON public.furgonetas_fotos FOR ALL USING (true) WITH CHECK (true);

-- 6. Tabla CONDUCTORES (ficha empleado) ───────────────────────
CREATE TABLE IF NOT EXISTS public.conductores (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre          text NOT NULL,
  apellidos       text,
  dni             text,
  fecha_nacimiento date,
  fecha_alta      date,
  tipo_contrato   text,
  salario_mensual numeric,
  telefono        text,
  email           text,
  direccion       text,
  carnet_tipo     text,
  carnet_caducidad date,
  cuenta_bancaria text,
  drive_dni_id    text,
  drive_carnet_id text,
  drive_contrato_id text,
  notas           text,
  activo          boolean DEFAULT true,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);
ALTER TABLE public.conductores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS p_cond_all ON public.conductores;
CREATE POLICY p_cond_all ON public.conductores FOR ALL USING (true) WITH CHECK (true);

-- 7. Vincular conductor activo en furgonetas ──────────────────
ALTER TABLE public.furgonetas
  ADD COLUMN IF NOT EXISTS conductor_id uuid REFERENCES public.conductores(id);

-- 8. SEED MOCKUP (datos 9999/0000 para validar UI) ────────────
INSERT INTO public.conductores (nombre, dni, telefono, email, fecha_alta, tipo_contrato, carnet_tipo)
VALUES
  ('David',  '99999999X', '+34 000 000 001', 'david@correcaminos.test', '2024-01-01',  'Autónomo', 'B'),
  ('Saad',   '99999999X', '+34 000 000 002', 'saad@correcaminos.test',  '2025-09-01',  'Autónomo', 'B'),
  ('Pau',    '99999999X', '+34 000 000 003', 'pau@correcaminos.test',   '2024-06-01',  'Autónomo', 'B'),
  ('Juan',   '99999999X', '+34 000 000 004', 'juan@correcaminos.test',  '2024-03-01',  'Autónomo', 'B')
ON CONFLICT DO NOTHING;

UPDATE public.furgonetas f
SET conductor_id = c.id
FROM public.conductores c
WHERE c.nombre = f.conductor AND f.conductor_id IS NULL;

-- Seguros mockup
INSERT INTO public.furgonetas_seguros (furgoneta_id, compania, numero_poliza, telefono, email, coberturas, franquicia_eur, prima_anual_eur, forma_pago, fecha_proximo_cobro, fecha_renovacion)
SELECT id,
       'Cía Mockup 0000',
       '9999-0000-' || codigo,
       '+34 900 000 000',
       'siniestros@mockup.test',
       'Todo riesgo con franquicia',
       300,
       1200,
       'Anual',
       (current_date + interval '90 days')::date,
       (current_date + interval '365 days')::date
FROM public.furgonetas
ON CONFLICT (furgoneta_id) DO NOTHING;

-- ITV mockup
INSERT INTO public.furgonetas_itv (furgoneta_id, estacion, estacion_tel, ultima_fecha, ultima_km, ultima_resultado, proxima_fecha)
SELECT id,
       'ITV Mockup 0000',
       '+34 900 000 999',
       (current_date - interval '60 days')::date,
       9999,
       'Favorable',
       (current_date + interval '305 days')::date
FROM public.furgonetas
ON CONFLICT (furgoneta_id) DO NOTHING;
