-- ============================================================
-- ERP DAVID — Migration 011: Auto-learn rules + seed categorías
-- ------------------------------------------------------------
-- Fase 2 Conciliación: aprende reglas del extracto BBVA importado
-- en la tabla `conciliacion` y las persiste en `reglas_conciliacion`
-- + `categorias_contables_gastos`.
--
-- Patrones derivados del análisis (solo los con ≥2 matches y que
-- caen dentro del mapeo negocio de reparto aprobado por el usuario):
--   "iberdrola" (12 mov.) → Suministros (mapeo: ENDESA/IBERDROLA/NATURGY)
--   "impuestos" (6 mov.)  → Impuestos   (mapeo: HACIENDA/AEAT; ajuste
--                                        al literal "Pago de impuestos"
--                                        que usa BBVA)
--
-- Patrones descartados (no aplicables según instrucción):
--   "remo mobility" (15) — no está en el mapeo → pendiente decisión
--   "ret. efectivo" (2)  — no está en el mapeo
--   Otros con <2 matches (Fenie energia, Transferencia realizada,
--   Cargo amortizacion, Transferencia recibida, Traspaso a cuenta) —
--   no superan el umbral ≥2.
-- ============================================================

-- 1. Categorías contables (gastos)
INSERT INTO public.categorias_contables_gastos (codigo, nombre, tipo, grupo, orden) VALUES
  ('SUMIN', 'Suministros', 'var',  'Servicios', 10),
  ('IMPUE', 'Impuestos',   'fijo', 'Hacienda',  20)
ON CONFLICT (codigo) DO NOTHING;

-- 2. Reglas de conciliación automática
INSERT INTO public.reglas_conciliacion (patron, tipo_categoria, categoria_codigo, asigna_como, activa, prioridad) VALUES
  ('iberdrola', 'gasto', 'SUMIN', 'categoria', true, 10),
  ('impuestos', 'gasto', 'IMPUE', 'categoria', true, 10)
ON CONFLICT (patron) DO NOTHING;

-- 3. Aplicar reglas a movimientos ya importados (idempotente)
UPDATE public.conciliacion
   SET categoria = 'Suministros'
 WHERE concepto ILIKE '%iberdrola%'
   AND (categoria IS NULL OR categoria = '');

UPDATE public.conciliacion
   SET categoria = 'Impuestos'
 WHERE concepto ILIKE '%impuestos%'
   AND (categoria IS NULL OR categoria = '');
