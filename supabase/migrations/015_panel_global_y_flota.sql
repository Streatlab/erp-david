-- ============================================================
-- ERP DAVID — Migration 015: Panel Global + Flota extendida
-- ------------------------------------------------------------
-- 1. Crea tablas nuevas: objetivos_facturacion, objetivos_diarios,
--    furgonetas_mantenimientos
-- 2. Amplía furgonetas con km, ITV, seguros, costes mensuales y
--    estado operativo
-- 3. Seedea presupuestos_mensuales y objetivos del mes/semana en curso
-- 4. Seedea valores razonables en furgonetas existentes
--
-- Aplicar via Supabase Studio → SQL Editor.
-- ============================================================

-- 1. OBJETIVOS DE FACTURACIÓN (semanal/mensual/anual) ─────────
CREATE TABLE IF NOT EXISTS public.objetivos_facturacion (
  id               SERIAL PRIMARY KEY,
  periodo          TEXT NOT NULL CHECK (periodo IN ('semanal','mensual','anual')),
  fecha_inicio     DATE NOT NULL,
  fecha_fin        DATE NOT NULL,
  importe_objetivo NUMERIC(10,2) NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (periodo, fecha_inicio, fecha_fin)
);

ALTER TABLE public.objetivos_facturacion ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY full_access_obj_fact ON public.objetivos_facturacion
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. OBJETIVOS DIARIOS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.objetivos_diarios (
  id               SERIAL PRIMARY KEY,
  fecha            DATE NOT NULL UNIQUE,
  importe_objetivo NUMERIC(10,2) NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.objetivos_diarios ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY full_access_obj_dia ON public.objetivos_diarios
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. PRESUPUESTOS MENSUALES — abrir RLS a anon/authenticated ───
DO $$ BEGIN
  CREATE POLICY full_access_pres_mes ON public.presupuestos_mensuales
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4. FURGONETAS — ampliar columnas operativas ──────────────────
ALTER TABLE public.furgonetas
  ADD COLUMN IF NOT EXISTS ruta                     TEXT,
  ADD COLUMN IF NOT EXISTS km_actual                INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS km_proxima_revision      INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS itv_fecha                DATE,
  ADD COLUMN IF NOT EXISTS seguro_fecha_vencimiento DATE,
  ADD COLUMN IF NOT EXISTS prestamo_mensual         NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS seguro_anual             NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS alquiler_mensual         NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estado                   TEXT DEFAULT 'OPERATIVA';

DO $$ BEGIN
  ALTER TABLE public.furgonetas
    ADD CONSTRAINT furgonetas_estado_chk
    CHECK (estado IN ('OPERATIVA','EN_REVISION','FUERA_SERVICIO'));
EXCEPTION WHEN duplicate_object THEN NULL; WHEN check_violation THEN NULL; END $$;

-- Política RLS abierta a anon/authenticated (la migration 012 ya
-- creó "allow_all" pero la dejamos consistente).
DO $$ BEGIN
  CREATE POLICY full_access_furgonetas ON public.furgonetas
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 5. HISTÓRICO DE MANTENIMIENTOS ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.furgonetas_mantenimientos (
  id            SERIAL PRIMARY KEY,
  furgoneta_id  UUID REFERENCES public.furgonetas(id) ON DELETE CASCADE,
  fecha         DATE NOT NULL,
  km_al_momento INTEGER,
  tipo          TEXT,
  descripcion   TEXT,
  coste         NUMERIC(10,2),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_furgo_mant_furgo ON public.furgonetas_mantenimientos(furgoneta_id);
CREATE INDEX IF NOT EXISTS idx_furgo_mant_fecha ON public.furgonetas_mantenimientos(fecha);

ALTER TABLE public.furgonetas_mantenimientos ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY full_access_furgo_mant ON public.furgonetas_mantenimientos
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 6. SEED — datos placeholder en furgonetas existentes ─────────
-- Solo aplica a las que están a 0 / NULL, no pisa datos reales.
UPDATE public.furgonetas SET
  ruta = COALESCE(ruta, CASE codigo WHEN '01' THEN 'Alcoi' WHEN '02' THEN 'Ontinyent' WHEN '03' THEN 'Ontinyent' WHEN '04' THEN 'Alcoi' END),
  km_actual = NULLIF(km_actual, 0),
  km_proxima_revision = NULLIF(km_proxima_revision, 0)
WHERE TRUE;

UPDATE public.furgonetas SET km_actual = 94580, km_proxima_revision = 95000, itv_fecha = '2026-05-02', seguro_fecha_vencimiento = '2026-10-15', prestamo_mensual = 485.00, seguro_anual = 720.00, ruta = 'Alcoi'      WHERE codigo = '01' AND km_actual IS NULL;
UPDATE public.furgonetas SET km_actual = 72150, km_proxima_revision = 75000, itv_fecha = '2027-02-10', seguro_fecha_vencimiento = '2026-05-16', prestamo_mensual = 465.00, seguro_anual = 690.00, ruta = 'Ontinyent'  WHERE codigo = '02' AND km_actual IS NULL;
UPDATE public.furgonetas SET km_actual = 78240, km_proxima_revision = 79080, itv_fecha = '2026-08-22', seguro_fecha_vencimiento = '2026-11-05', prestamo_mensual = 445.00, seguro_anual = 660.00, ruta = 'Ontinyent'  WHERE codigo = '03' AND km_actual IS NULL;
UPDATE public.furgonetas SET km_actual = 58920, km_proxima_revision = 60000, itv_fecha = '2027-01-18', seguro_fecha_vencimiento = '2026-12-20', prestamo_mensual = 445.00, seguro_anual = 660.00, ruta = 'Alcoi'      WHERE codigo = '04' AND km_actual IS NULL;

-- 7. SEED — presupuestos mes en curso ──────────────────────────
INSERT INTO public.presupuestos_mensuales (anio, mes, categoria, tope) VALUES
  (EXTRACT(YEAR FROM CURRENT_DATE)::int,  EXTRACT(MONTH FROM CURRENT_DATE)::int, 'RRHH',              6500),
  (EXTRACT(YEAR FROM CURRENT_DATE)::int,  EXTRACT(MONTH FROM CURRENT_DATE)::int, 'VEHICULOS_RENTING', 1840),
  (EXTRACT(YEAR FROM CURRENT_DATE)::int,  EXTRACT(MONTH FROM CURRENT_DATE)::int, 'COMBUSTIBLE',        950),
  (EXTRACT(YEAR FROM CURRENT_DATE)::int,  EXTRACT(MONTH FROM CURRENT_DATE)::int, 'CONTROLABLES',       600)
ON CONFLICT (anio, mes, categoria) DO NOTHING;

-- 8. SEED — objetivos mensual/anual en curso ───────────────────
INSERT INTO public.objetivos_facturacion (periodo, fecha_inicio, fecha_fin, importe_objetivo) VALUES
  ('mensual',
   date_trunc('month', CURRENT_DATE)::date,
   (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::date,
   18000),
  ('anual',
   date_trunc('year',  CURRENT_DATE)::date,
   (date_trunc('year',  CURRENT_DATE) + INTERVAL '1 year - 1 day')::date,
   216000)
ON CONFLICT (periodo, fecha_inicio, fecha_fin) DO NOTHING;
