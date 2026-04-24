-- ============================================================
-- ERP DAVID — Migration 013: Proveedores
-- ------------------------------------------------------------
-- Crea tabla proveedores + FK conciliacion.proveedor_id. Genera
-- semilla automática agrupando por "primeras 2 palabras" del
-- concepto (quitando números/fechas). Cada patrón con >=2
-- matches crea un proveedor con categoria_default = la
-- categoría más frecuente entre sus movimientos.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.proveedores (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre            text NOT NULL UNIQUE,
  nif               text,
  patron_detectar   text,
  categoria_default text,
  activo            boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.proveedores ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY allow_all ON public.proveedores FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.conciliacion
  ADD COLUMN IF NOT EXISTS proveedor_id uuid REFERENCES public.proveedores(id);
CREATE INDEX IF NOT EXISTS idx_conciliacion_proveedor_id ON public.conciliacion(proveedor_id);

-- Seed: primeras 2 palabras del concepto (quitando números/fechas),
-- agrupar, >=2 matches → 1 proveedor.
WITH mov_norm AS (
  SELECT
    id,
    categoria,
    lower(trim(
      split_part(regexp_replace(concepto, '[0-9./,-]+', ' ', 'g'), ' ', 1) || ' ' ||
      split_part(regexp_replace(concepto, '[0-9./,-]+', ' ', 'g'), ' ', 2)
    )) AS patron
  FROM public.conciliacion
),
patrones AS (
  SELECT
    patron,
    COUNT(*) AS n,
    mode() WITHIN GROUP (ORDER BY categoria)
      FILTER (WHERE categoria IS NOT NULL AND categoria <> '') AS cat_freq
  FROM mov_norm
  WHERE patron IS NOT NULL AND length(patron) >= 4
  GROUP BY patron
  HAVING COUNT(*) >= 2
)
INSERT INTO public.proveedores (nombre, patron_detectar, categoria_default)
SELECT initcap(patron), patron, cat_freq
FROM patrones
ON CONFLICT (nombre) DO NOTHING;

-- Asignar proveedor_id a los movimientos existentes
UPDATE public.conciliacion c
   SET proveedor_id = p.id
  FROM public.proveedores p
 WHERE p.patron_detectar IS NOT NULL
   AND c.proveedor_id IS NULL
   AND c.concepto ILIKE '%' || p.patron_detectar || '%';
