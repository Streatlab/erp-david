# banco-sync — robot bancario nocturno (Enable Banking)

Copia versionada del código desplegado en Supabase David (función `banco-sync`).
La fuente viva es la función desplegada; si se cambia allí, actualizar aquí en el mismo commit.

- v2 (sep-2026): descarga movimientos de BBVA y N26, los vuelca a `conciliacion` aplicando reglas,
  vigila la caducidad del consentimiento (90 días) y avisa por WhatsApp 15 días antes.
- v3 (02-oct-2026): si el banco solo permite pedir los últimos 90 días (N26 devolvía 422 cada noche
  en una subcuenta sin histórico), repite la descarga acotada a 89 días en vez de fallar.
- Cron: `banco-sync-diario` a las 03:10 UTC (05:10 Madrid).
