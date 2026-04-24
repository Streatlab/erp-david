-- ============================================================
-- ERP DAVID — Migration 012: Furgonetas + prorrateo automático
-- ------------------------------------------------------------
-- Introduce la asignación de gastos a furgonetas con dos modos:
--   1. Directo — conciliacion.furgoneta_id != NULL (100% a esa furgo)
--   2. Prorrateo — conciliacion.prorrateo=true y furgoneta_id=NULL
--                  (se divide /4 entre las furgonetas activas)
--
-- El trigger set_prorrateo_auto marca prorrateo=true automáticamente
-- al INSERT/UPDATE cuando la categoría cae en la lista de flota y no
-- hay furgoneta asignada manualmente. "Seguros" queda FUERA hasta que
-- se defina cómo distinguir flota vs no-flota.
-- ============================================================

-- 1. Tabla furgonetas
CREATE TABLE IF NOT EXISTS public.furgonetas (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo       text UNIQUE NOT NULL,
  nombre_corto text NOT NULL,
  conductor    text NOT NULL,
  matricula    text,
  modelo       text,
  activa       boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.furgonetas (codigo, nombre_corto, conductor, matricula, modelo) VALUES
  ('01', 'Furgoneta #01', 'Saad',  '3452 KBC', 'Renault Kangoo'),
  ('02', 'Furgoneta #02', 'Joel',  '7821 LMD', 'Renault Kangoo'),
  ('03', 'Furgoneta #03', 'Juan',  '1245 MNF', 'Citroën Berlingo'),
  ('04', 'Furgoneta #04', 'David', '9034 PQR', 'Renault Kangoo')
ON CONFLICT (codigo) DO NOTHING;

ALTER TABLE public.furgonetas ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY allow_all ON public.furgonetas FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Columnas en conciliacion
ALTER TABLE public.conciliacion
  ADD COLUMN IF NOT EXISTS furgoneta_id uuid REFERENCES public.furgonetas(id);
ALTER TABLE public.conciliacion
  ADD COLUMN IF NOT EXISTS prorrateo boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_conciliacion_furgoneta_id ON public.conciliacion(furgoneta_id);

-- 3. Trigger de prorrateo automático
CREATE OR REPLACE FUNCTION public.set_prorrateo_auto()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.categoria IN (
    'Combustible/Energía vehículo',
    'Combustible',
    'Leasing furgonetas',
    'Mantenimiento vehículos',
    'COMBUSTIBLE',
    'COMBUSTIBLE_ENERGIA_VEHICULO',
    'LEASING_FURGONETAS',
    'MANTENIMIENTO_VEHICULOS'
  ) AND NEW.furgoneta_id IS NULL THEN
    NEW.prorrateo := true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_prorrateo ON public.conciliacion;
CREATE TRIGGER trg_set_prorrateo
BEFORE INSERT OR UPDATE OF categoria, furgoneta_id ON public.conciliacion
FOR EACH ROW EXECUTE FUNCTION public.set_prorrateo_auto();

-- 4. Backfill datos existentes
UPDATE public.conciliacion
   SET prorrateo = true
 WHERE categoria IN (
    'Combustible/Energía vehículo',
    'Combustible',
    'Leasing furgonetas',
    'Mantenimiento vehículos',
    'COMBUSTIBLE',
    'COMBUSTIBLE_ENERGIA_VEHICULO',
    'LEASING_FURGONETAS',
    'MANTENIMIENTO_VEHICULOS'
  )
  AND furgoneta_id IS NULL;

-- 5. Vista v_gastos_por_furgoneta
CREATE OR REPLACE VIEW public.v_gastos_por_furgoneta AS
SELECT
  f.id           AS furgoneta_id,
  f.codigo,
  f.nombre_corto,
  f.conductor,
  date_trunc('month', c.fecha) AS mes,
  SUM(ABS(c.importe))          AS gasto_total,
  COUNT(*)                     AS num_movimientos,
  'directo'                    AS tipo
FROM public.conciliacion c
JOIN public.furgonetas   f ON f.id = c.furgoneta_id
WHERE c.importe < 0
GROUP BY f.id, f.codigo, f.nombre_corto, f.conductor, date_trunc('month', c.fecha)
UNION ALL
SELECT
  f.id           AS furgoneta_id,
  f.codigo,
  f.nombre_corto,
  f.conductor,
  date_trunc('month', c.fecha) AS mes,
  SUM(ABS(c.importe) / 4.0)    AS gasto_total,
  COUNT(*)                     AS num_movimientos,
  'prorrateo'                  AS tipo
FROM public.conciliacion c
CROSS JOIN public.furgonetas f
WHERE c.importe < 0
  AND c.prorrateo = true
  AND c.furgoneta_id IS NULL
  AND f.activa = true
GROUP BY f.id, f.codigo, f.nombre_corto, f.conductor, date_trunc('month', c.fecha);
