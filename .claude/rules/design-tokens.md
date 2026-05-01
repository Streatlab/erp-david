# Reglas David — Design Tokens Marino+Fuego Mediterráneo

## Tokens canónicos (únicos permitidos)
- **Marino**: `#16355C`
- **Naranja Valencia**: `#F26B1F`
- **Arena cálida**: definida en tokens.ts
- **Regla 60/30/10**: 60% marino + arena, 30% complementarios, 10% naranja como acento

## Master files
- `src/styles/tokens.ts`
- `src/styles/design-tokens.css`
- `DESIGN-SYSTEM.md`

## Prohibido
- Hex hardcodeados en componentes.
- Tokens del repo binagre: `#B01D23`, `#0a0a0a`, `#1e2233`, `#e8f442`, `#484f66`.
- Mezclar paletas.
- Gráficos con rojos (incompatible con Marino+Fuego).

## Cómo usar
Importar siempre desde `src/styles/tokens.ts`. Si un token no existe, añadirlo allí primero.
