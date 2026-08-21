# Fondo de reposición — cómo activar el guardado

Los datos del plan de reposición de flota antes vivían solo en el navegador.
Ahora van a la base de datos. Falta un paso manual, una sola vez.

## Qué se ha creado

Una tabla, `furgonetas_reposicion_params`: una fila por furgoneta con el precio de
la furgo nueva, los km al año, la vida útil, la subida de precio anual, lo que te
dan por la vieja y lo que ya llevas ahorrado.

## Pasos (una sola vez)

1. Entra en Supabase del proyecto de David y abre **SQL Editor**.
2. Abre el archivo `supabase/migrations/017_reposicion_params.sql` de este repo.
3. Copia todo su contenido y pégalo en el editor.
4. Pulsa **Run**. Si no da error, listo.
5. Entra en el ERP → Flota → Fondo de reposición y toca cualquier dato: debe
   aparecer "Guardado" debajo del botón.

## Mientras tanto

La pantalla sigue funcionando aunque la tabla no exista todavía: guarda en el
navegador y avisa con la etiqueta **"Solo en este navegador"**. En cuanto se
aplique el paso de arriba, lo que ya tuvieras guardado se sube solo.
