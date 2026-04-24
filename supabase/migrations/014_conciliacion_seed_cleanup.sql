-- ============================================================
-- ERP DAVID — Migration 014: Conciliación seed + cleanup
-- ------------------------------------------------------------
-- Fase 4 post-auditoría:
--   1. Seedear categorías de INGRESOS (estaban vacías → Resumen = 0€)
--   2. Eliminar duplicado 'combustible-energia-vehiculo' (redundante
--      con 'combustible') y migrar movimientos al nuevo código
--   3. Normalizar 'grupo' en gastos a minúsculas ASCII
--   4. Añadir reglas para patrones frecuentes (ayvens, allianz, mapfre,
--      sofinco, santander consumer, fenie, feu vert, zunder, etc.)
--   5. Backfill proveedor_id en movimientos existentes vía patrón
--   6. Re-aplicar reglas sobre movimientos sin categoría
-- ============================================================

-- 1. Categorías de ingresos (7)
INSERT INTO public.categorias_contables_ingresos (codigo, nombre, canal_abv, orden) VALUES
  ('ventas-uber',          'Ventas Uber',          'Uber',       10),
  ('ventas-glovo',         'Ventas Glovo',         'Glovo',      20),
  ('ventas-justeat',       'Ventas JustEat',       'JustEat',    30),
  ('ventas-web',           'Ventas Web',           'Web',        40),
  ('ventas-directa',       'Ventas Directa',       'Directa',    50),
  ('otros-ingresos',       'Otros ingresos',       'Otros',      60),
  ('movimientos-internos', 'Movimientos internos', 'Tesorería',  90)
ON CONFLICT (codigo) DO UPDATE
  SET nombre    = EXCLUDED.nombre,
      canal_abv = EXCLUDED.canal_abv,
      orden     = EXCLUDED.orden;

-- 2. Eliminar duplicado combustible-energia-vehiculo
UPDATE public.conciliacion
   SET categoria = 'combustible'
 WHERE categoria = 'combustible-energia-vehiculo';

UPDATE public.reglas_conciliacion
   SET categoria_codigo = 'combustible'
 WHERE categoria_codigo = 'combustible-energia-vehiculo';

DELETE FROM public.categorias_contables_gastos
 WHERE codigo = 'combustible-energia-vehiculo';

-- 3. Normalizar grupos a minúsculas ASCII
UPDATE public.categorias_contables_gastos SET grupo = 'vehiculos'   WHERE grupo IN ('Vehículos', 'vehículos', 'vehiculos');
UPDATE public.categorias_contables_gastos SET grupo = 'servicios'   WHERE grupo IN ('Servicios', 'servicios');
UPDATE public.categorias_contables_gastos SET grupo = 'hacienda'    WHERE grupo IN ('Hacienda', 'hacienda');
UPDATE public.categorias_contables_gastos SET grupo = 'personal'    WHERE grupo IN ('Personal', 'personal');
UPDATE public.categorias_contables_gastos SET grupo = 'operaciones' WHERE grupo IN ('Operaciones', 'operaciones');
UPDATE public.categorias_contables_gastos SET grupo = 'tesoreria'   WHERE grupo IN ('Tesorería', 'tesoreria', 'tesorería');

-- 4. Reglas adicionales para patrones frecuentes
INSERT INTO public.reglas_conciliacion (patron, tipo_categoria, categoria_codigo, prioridad, activa) VALUES
  ('fenie energia',         'gasto',   'suministros',            20, true),
  ('sofinco',               'gasto',   'leasing-furgonetas',     20, true),
  ('santander consumer',    'gasto',   'leasing-furgonetas',     20, true),
  ('cargo por amortizacion','gasto',   'leasing-furgonetas',     15, true),
  ('ayvens',                'gasto',   'leasing-furgonetas',     20, true),
  ('allianz',               'gasto',   'seguros',                20, true),
  ('mapfre',                'gasto',   'seguros',                20, true),
  ('legalitas',             'gasto',   'seguros',                20, true),
  ('adeudo ayuntamiento',   'gasto',   'impuestos',              20, true),
  ('feu vert',              'gasto',   'mantenimiento-vehiculos',20, true),
  ('zunder',                'gasto',   'combustible',            20, true),
  ('pinturas arte nuevo',   'gasto',   'mantenimiento-vehiculos',15, true),
  ('traspaso desde cuenta', 'ingreso', 'movimientos-internos',   15, true),
  ('traspaso a cuenta',     'ingreso', 'movimientos-internos',   15, true),
  ('anulacion adeudo',      'ingreso', 'movimientos-internos',   10, true)
ON CONFLICT (patron) DO NOTHING;

-- 5. Backfill proveedor_id en movimientos existentes
WITH matches AS (
  SELECT c.id AS conc_id, p.id AS prov_id, p.nombre AS prov_nombre,
         ROW_NUMBER() OVER (PARTITION BY c.id ORDER BY LENGTH(p.patron_detectar) DESC) AS rn
    FROM public.conciliacion c
    JOIN public.proveedores p
      ON p.activo = true
     AND p.patron_detectar IS NOT NULL
     AND LOWER(c.concepto) LIKE '%' || LOWER(p.patron_detectar) || '%'
   WHERE c.proveedor_id IS NULL
)
UPDATE public.conciliacion c
   SET proveedor_id = m.prov_id,
       proveedor    = COALESCE(c.proveedor, m.prov_nombre)
  FROM matches m
 WHERE m.conc_id = c.id AND m.rn = 1;

-- 6. Re-aplicar reglas a movimientos sin categoría (mayor prioridad gana)
WITH matches AS (
  SELECT c.id AS conc_id, r.categoria_codigo, r.tipo_categoria,
         ROW_NUMBER() OVER (PARTITION BY c.id ORDER BY r.prioridad DESC, LENGTH(r.patron) DESC) AS rn
    FROM public.conciliacion c
    JOIN public.reglas_conciliacion r
      ON r.activa = true
     AND r.categoria_codigo IS NOT NULL
     AND LOWER(c.concepto) LIKE '%' || LOWER(r.patron) || '%'
   WHERE c.categoria IS NULL
)
UPDATE public.conciliacion c
   SET categoria = m.categoria_codigo,
       tipo      = m.tipo_categoria
  FROM matches m
 WHERE m.conc_id = c.id AND m.rn = 1;

-- 7. Heredar categoria_default de proveedor cuando sigue null
UPDATE public.conciliacion c
   SET categoria = p.categoria_default,
       tipo      = 'gasto'
  FROM public.proveedores p
 WHERE c.proveedor_id = p.id
   AND c.categoria IS NULL
   AND p.categoria_default IS NOT NULL;
