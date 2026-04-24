-- ============================================================
-- ERP DAVID — Migration 010: Conciliación bancaria
-- ------------------------------------------------------------
-- Crea tablas + RPCs requeridas por:
--   src/pages/Conciliacion.tsx
--   src/pages/configuracion/bancos/*
-- Schema portado desde Streatlab/binagre (idéntico) pero
-- aislado en proyecto Supabase de David (idclhnxttdbwayxeowrm).
--
-- Aplicar vía:
--   supabase db push    (si usas Supabase CLI)
--   o Supabase Studio → SQL Editor → ejecutar este archivo
-- ============================================================

-- 1. CATEGORÍAS CONTABLES ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.categorias_contables_ingresos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo      text NOT NULL UNIQUE,
  nombre      text NOT NULL,
  canal_abv   text,
  orden       integer NOT NULL DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.categorias_contables_gastos (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo        text NOT NULL UNIQUE,
  nombre        text NOT NULL,
  tipo          text NOT NULL CHECK (tipo IN ('fijo','var','pers','mkt')),
  grupo         text,
  orden         integer NOT NULL DEFAULT 0,
  iva_pct       numeric DEFAULT 10,
  iva_estimado  boolean DEFAULT true,
  created_at    timestamptz DEFAULT now()
);


-- 2. CONCILIACIÓN (movimientos bancarios) ─────────────────────

CREATE TABLE IF NOT EXISTS public.conciliacion (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha               date,
  concepto            text,
  importe             numeric,
  tipo                text,
  categoria           text,
  proveedor           text,
  factura             text,
  mes                 text,
  link_factura        text,
  notas               text,
  gasto_id            uuid,
  dedup_key           text,
  iva_pct             numeric,
  iva_origen          text DEFAULT 'estimado',
  base_imponible      numeric,
  iva_soportado       numeric,
  iva_real_soportado  numeric,
  base_real           numeric,
  created_at          timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conciliacion_fecha    ON public.conciliacion(fecha);
CREATE INDEX IF NOT EXISTS conciliacion_gasto_id_idx ON public.conciliacion(gasto_id);
CREATE UNIQUE INDEX IF NOT EXISTS conciliacion_dedup_unique ON public.conciliacion(dedup_key);


-- 3. GASTOS ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.gastos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha           date NOT NULL,
  categoria       text NOT NULL,
  subcategoria    text,
  proveedor       text,
  proveedor_abv   text,
  concepto        text,
  importe         numeric NOT NULL,
  marca           text,
  grupo           text,
  conciliacion_id uuid REFERENCES public.conciliacion(id) ON DELETE SET NULL,
  iva_pct         numeric,
  iva_origen      text DEFAULT 'estimado',
  base_imponible  numeric,
  iva_soportado   numeric,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE public.conciliacion
  DROP CONSTRAINT IF EXISTS conciliacion_gasto_id_fkey,
  ADD  CONSTRAINT conciliacion_gasto_id_fkey
       FOREIGN KEY (gasto_id) REFERENCES public.gastos(id) ON DELETE SET NULL;


-- 4. REGLAS DE CONCILIACIÓN AUTOMÁTICA ────────────────────────

CREATE TABLE IF NOT EXISTS public.reglas_conciliacion (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patron            text NOT NULL,
  tipo_categoria    text NOT NULL CHECK (tipo_categoria IN ('ingreso','gasto')),
  categoria_id      uuid,
  categoria_codigo  text,
  asigna_como       text,
  activa            boolean DEFAULT true,
  prioridad         integer DEFAULT 0,
  created_at        timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS reglas_conciliacion_patron_uniq
  ON public.reglas_conciliacion(patron);


-- 5. CUENTAS BANCARIAS ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.cuentas_bancarias (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alias          text NOT NULL,
  banco          text NOT NULL,
  iban_mask      text NOT NULL,
  numero_cuenta  text,
  iban           text,
  swift          text,
  uso_principal  text,
  saldo          numeric NOT NULL DEFAULT 0,
  saldo_actual   numeric DEFAULT 0,
  activa         boolean NOT NULL DEFAULT true,
  es_principal   boolean NOT NULL DEFAULT false,
  created_at     timestamptz DEFAULT now()
);


-- 6. PRESUPUESTOS MENSUALES ───────────────────────────────────

CREATE TABLE IF NOT EXISTS public.presupuestos_mensuales (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anio       integer NOT NULL,
  mes        integer NOT NULL CHECK (mes BETWEEN 1 AND 12),
  categoria  text NOT NULL,
  tope       numeric NOT NULL,
  UNIQUE (anio, mes, categoria)
);


-- 7. PROVISIONES (IVA / IRPF) ─────────────────────────────────

CREATE TABLE IF NOT EXISTS public.provisiones (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo             text NOT NULL,
  periodo          text NOT NULL,
  fecha_inicio     date NOT NULL,
  fecha_fin        date NOT NULL,
  importe          numeric NOT NULL,
  estado           text DEFAULT 'pendiente',
  fecha_pago       date,
  notas            text,
  calculo_detalle  jsonb,
  created_at       timestamp DEFAULT now(),
  updated_at       timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS provisiones_tipo_periodo_uk
  ON public.provisiones(tipo, periodo);
CREATE INDEX IF NOT EXISTS idx_provisiones_estado
  ON public.provisiones(estado);


-- 8. CONFIGURACIÓN (key-value) ────────────────────────────────

CREATE TABLE IF NOT EXISTS public.configuracion (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clave                      text NOT NULL UNIQUE,
  valor                      text NOT NULL,
  coste_estructura_override  numeric,
  coste_estructura_fuente    text NOT NULL DEFAULT 'running',
  updated_at                 timestamptz DEFAULT now()
);

-- Seed mínimo para ProvisionesPanel
INSERT INTO public.configuracion (clave, valor) VALUES
  ('alquiler_base_mensual', '850'),
  ('alquiler_irpf_pct',     '19')
ON CONFLICT (clave) DO NOTHING;


-- 9. RPC: calcular_irpf_alquiler_mes ──────────────────────────

CREATE OR REPLACE FUNCTION public.calcular_irpf_alquiler_mes(p_periodo text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_base numeric;
  v_pct numeric;
  v_retencion numeric;
  v_inicio date;
  v_fin date;
BEGIN
  SELECT valor::numeric INTO v_base FROM configuracion WHERE clave = 'alquiler_base_mensual';
  SELECT valor::numeric INTO v_pct  FROM configuracion WHERE clave = 'alquiler_irpf_pct';
  IF v_base IS NULL THEN v_base := 850; END IF;
  IF v_pct  IS NULL THEN v_pct  := 19;  END IF;
  v_retencion := ROUND(v_base * v_pct / 100, 2);
  v_inicio := (p_periodo || '-01')::date;
  v_fin    := (v_inicio + INTERVAL '1 month - 1 day')::date;

  INSERT INTO provisiones (tipo, periodo, fecha_inicio, fecha_fin, importe, notas, calculo_detalle)
  VALUES (
    'IRPF_ALQ', p_periodo, v_inicio, v_fin, v_retencion,
    'Retención ' || v_pct || '% sobre alquiler local',
    jsonb_build_object('base', v_base, 'pct', v_pct)
  )
  ON CONFLICT (tipo, periodo) DO UPDATE SET
    importe         = EXCLUDED.importe,
    notas           = EXCLUDED.notas,
    calculo_detalle = EXCLUDED.calculo_detalle,
    updated_at      = now();
END;
$function$;


-- 10. RPC: calcular_iva_trimestral ────────────────────────────
-- NOTA: depende de tabla `ingresos_mensuales` (no incluida aquí).
-- Si David no la tiene aún, esta RPC no se llamará desde la UI
-- hasta que se implemente el módulo Running. Se incluye el cuerpo
-- por paridad con Binagre. Si falta `ingresos_mensuales`, la
-- llamada lanzará error pero NO impide el resto de Conciliación.

CREATE OR REPLACE FUNCTION public.calcular_iva_trimestral(p_periodo text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_anio int;
  v_q text;
  v_mes_inicio int;
  v_mes_fin int;
  v_inicio date;
  v_fin date;
  v_iva_rep numeric := 0;
  v_iva_sop numeric := 0;
  v_liquidar numeric;
BEGIN
  v_anio := LEFT(p_periodo, 4)::int;
  v_q    := RIGHT(p_periodo, 2);
  IF    v_q = 'Q1' THEN v_mes_inicio := 1;  v_mes_fin := 3;
  ELSIF v_q = 'Q2' THEN v_mes_inicio := 4;  v_mes_fin := 6;
  ELSIF v_q = 'Q3' THEN v_mes_inicio := 7;  v_mes_fin := 9;
  ELSIF v_q = 'Q4' THEN v_mes_inicio := 10; v_mes_fin := 12;
  ELSE RAISE EXCEPTION 'Periodo inválido: %', p_periodo;
  END IF;
  v_inicio := make_date(v_anio, v_mes_inicio, 1);
  v_fin    := (make_date(v_anio, v_mes_fin, 1) + INTERVAL '1 month - 1 day')::date;

  -- IVA repercutido (ventas) — requiere tabla `ingresos_mensuales`
  BEGIN
    EXECUTE
      'SELECT COALESCE(SUM(iva_repercutido), 0) FROM ingresos_mensuales
       WHERE tipo = ''neto'' AND anio = $1 AND mes BETWEEN $2 AND $3'
    INTO v_iva_rep
    USING v_anio, v_mes_inicio, v_mes_fin;
  EXCEPTION WHEN undefined_table THEN
    v_iva_rep := 0;
  END;

  -- IVA soportado (gastos): importe<0, iva_soportado negativo
  SELECT COALESCE(SUM(-iva_soportado), 0) INTO v_iva_sop
  FROM conciliacion
  WHERE fecha BETWEEN v_inicio AND v_fin AND importe < 0;

  v_liquidar := v_iva_rep - v_iva_sop;

  INSERT INTO provisiones (tipo, periodo, fecha_inicio, fecha_fin, importe, calculo_detalle)
  VALUES ('IVA_TRIM', p_periodo, v_inicio, v_fin, v_liquidar,
    jsonb_build_object('iva_repercutido', v_iva_rep, 'iva_soportado', v_iva_sop))
  ON CONFLICT (tipo, periodo) DO UPDATE SET
    importe         = EXCLUDED.importe,
    calculo_detalle = EXCLUDED.calculo_detalle,
    fecha_inicio    = EXCLUDED.fecha_inicio,
    fecha_fin       = EXCLUDED.fecha_fin,
    updated_at      = now();
END;
$function$;


-- 11. RLS — abierto para auth anon (mismo patrón que David usa) ─

ALTER TABLE public.conciliacion                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reglas_conciliacion             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias_contables_ingresos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias_contables_gastos     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gastos                          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cuentas_bancarias               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presupuestos_mensuales          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provisiones                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion                   ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "allow all" ON public.conciliacion                   FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "allow all" ON public.reglas_conciliacion            FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "allow all" ON public.categorias_contables_ingresos  FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "allow all" ON public.categorias_contables_gastos    FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "allow all" ON public.gastos                         FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "allow all" ON public.cuentas_bancarias              FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "allow all" ON public.presupuestos_mensuales         FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "allow all" ON public.provisiones                    FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "allow all" ON public.configuracion                  FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
