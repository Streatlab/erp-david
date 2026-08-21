-- ============================================================
-- 017_reposicion_params.sql
-- Fondo de reposición de flota: parámetros del plan por furgoneta.
--
-- Hasta ahora estos datos vivían solo en el localStorage del navegador.
-- Es un plan a 7 años: tienen que vivir en la base de datos y verse
-- desde cualquier dispositivo.
--
-- Aplicar vía Supabase Studio → SQL Editor.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.furgonetas_reposicion_params (
  furgoneta_id     UUID PRIMARY KEY REFERENCES public.furgonetas(id) ON DELETE CASCADE,
  fecha_compra     DATE,
  km_actual        NUMERIC(10,0) DEFAULT 0,
  km_anio          NUMERIC(10,0) DEFAULT 0,
  vida_km          NUMERIC(10,0) DEFAULT 200000,
  vida_anios       NUMERIC(5,2)  DEFAULT 8,
  precio_nuevo_hoy NUMERIC(12,2) DEFAULT 0,
  inflacion        NUMERIC(5,2)  DEFAULT 3,
  residual_pct     NUMERIC(5,2)  DEFAULT 12,
  ahorro_acumulado NUMERIC(12,2) DEFAULT 0,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.furgonetas_reposicion_params IS
  'Plan de ahorro para reponer cada furgoneta (sinking fund). Una fila por furgoneta.';

-- updated_at automático
CREATE OR REPLACE FUNCTION public.fn_reposicion_params_touch()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_reposicion_params_touch ON public.furgonetas_reposicion_params;
CREATE TRIGGER trg_reposicion_params_touch
  BEFORE UPDATE ON public.furgonetas_reposicion_params
  FOR EACH ROW EXECUTE FUNCTION public.fn_reposicion_params_touch();

-- RLS: mismo patrón que el resto de tablas de flota (012 / 015).
-- La app entra con PIN propio, no con Auth nativo: si se limita a
-- 'authenticated', todo devuelve 401.
ALTER TABLE public.furgonetas_reposicion_params ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY full_access_reposicion_params ON public.furgonetas_reposicion_params
    FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
