# 🎨 David ERP — Design System

> **⚠️ AISLAMIENTO TOTAL**
> Este design system es EXCLUSIVO de DavidReparte (`erp-david` / `davidparte.vercel.app`).
> **NO tiene ninguna relación con Streat Lab / Binagre.**
> Nunca importar tokens, colores o estilos del ERP Binagre. Nunca al revés.

---

## 🎯 ADN visual en 3 líneas

- **Tema:** Marino + Fuego · Mediterráneo vivo
- **Paleta:** Marino ancla · Naranja Valencia acento · Arena cálida de fondo · Terra/Ámbar/Oliva semánticos
- **Personalidad:** Profesional + cálido + cercano. Mercado mediterráneo, no SaaS frío.

---

## 📁 Archivos fuente (NO editar a mano)

```
src/
├── styles/
│   ├── design-tokens.css    ← CSS variables, importado en main.tsx
│   └── tokens.ts            ← helpers TypeScript (useTheme, cardStyle, fmtEur...)
tailwind.config.js           ← mapea CSS vars a clases Tailwind
```

Cualquier cambio requiere **bump de versión** y nota en este doc.

---

## 🎨 Cómo usar los colores

### Opción A — Tailwind (recomendada para nuevos componentes)

```tsx
// Fondos y superficies
<div className="bg-bg-app">           // fondo de app
<div className="bg-bg-surface">       // card
<div className="bg-bg-surface-alt">   // hover

// Texto
<p className="text-text-primary">       // tinta principal
<p className="text-text-secondary">     // secundario
<p className="text-text-on-primary">    // sobre marino
<p className="text-text-on-accent">     // sobre naranja

// Marca
<button className="bg-brand-accent text-text-on-accent">  // CTA naranja
<button className="border border-brand-primary text-brand-primary">  // outline marino

// Semánticos
<div className="bg-success-bg text-success-text border border-success-border">
<div className="bg-warning-bg text-warning-text">
<div className="bg-danger-bg text-danger-text">

// Operadores (cards tintadas)
<div className="bg-op-mercadona-bg text-op-mercadona-fg border border-op-mercadona-bd">
<div className="bg-op-carrefour-bg text-op-carrefour-fg border border-op-carrefour-bd">
<div className="bg-op-lidl-bg text-op-lidl-fg border border-op-lidl-bd">
<div className="bg-op-dia-bg text-op-dia-fg border border-op-dia-bd">
```

### Opción B — Helpers TypeScript (para estilos dinámicos o compuestos)

```tsx
import { useTheme, getTokens, cardStyle, fmtEur } from '@/styles/tokens';

function MiComponente() {
  const theme = useTheme();
  const t = getTokens(theme);

  return (
    <div style={cardStyle(theme)}>
      <p style={{ color: t.textPrimary }}>
        {fmtEur(4820.5)}  {/* → 4.820,50 € */}
      </p>
    </div>
  );
}
```

### Opción C — CSS puro (solo en casos especiales)

```css
.mi-componente {
  background: var(--bg-surface);
  color: var(--text-primary);
  border: 0.5px solid var(--border-default);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
}
```

---

## ✍️ Tipografía — reglas estrictas

| Elemento           | Clase Tailwind                                          | Uso                        |
|--------------------|---------------------------------------------------------|----------------------------|
| Título sección     | `text-xs tracking-wider uppercase text-brand-accent font-bold` | VENTAS, PEDIDOS DEL DÍA    |
| Label micro        | `text-2xs tracking-wide uppercase text-text-secondary font-medium` | Badges, meta               |
| KPI número         | `text-xl tracking-tight font-bold text-text-primary`    | 4.820 €, 1.247 pedidos    |
| Subtítulo          | `text-md font-medium text-text-primary`                 | Títulos de card            |
| Cuerpo             | `text-base text-text-primary`                           | Párrafos                   |
| Meta / secundario  | `text-sm text-text-secondary`                           | Fechas, descripciones      |

### ❌ NUNCA
- ALL CAPS sin `tracking-wide` o `tracking-wider`
- Pesos distintos de `font-regular (400)`, `font-medium (500)`, `font-bold (700)`
- Más de 3 pesos en una pantalla
- Negro puro (`#000`) o blanco puro (`#FFF`) en texto

---

## 🧱 Componentes base

### Botón primario (CTA)
```tsx
<button className="bg-brand-accent text-text-on-accent px-4 py-2 rounded-md text-sm font-medium hover:bg-brand-accent-hover transition-colors duration-fast">
  Nuevo pedido
</button>
```

### Botón secundario
```tsx
<button className="border border-brand-primary text-brand-primary px-4 py-2 rounded-md text-sm font-medium hover:bg-info-bg transition-colors duration-fast">
  Ver detalle
</button>
```

### Card KPI
```tsx
<div className="bg-bg-surface border border-border-default rounded-lg p-6">
  <p className="text-2xs tracking-wide uppercase text-text-secondary font-medium">
    Pedidos hoy
  </p>
  <p className="text-xl tracking-tight font-bold text-text-primary mt-2">
    1.247
  </p>
  <p className="text-xs text-success-text mt-1">↑ 12.4%</p>
</div>
```

### Card de operador (tintada)
```tsx
<div className="bg-op-mercadona-bg border border-op-mercadona-bd rounded-md p-4">
  <p className="text-2xs tracking-wide uppercase text-op-mercadona-fg font-medium">
    Mercadona
  </p>
  <p className="text-lg font-bold text-text-primary mt-1">420 pedidos</p>
</div>
```

### Badge
```tsx
<span className="inline-flex items-center text-2xs font-bold tracking-wide uppercase px-2.5 py-0.5 rounded-pill bg-brand-primary text-text-on-primary">
  En ruta
</span>
```

---

## 🔀 Modo oscuro

Se activa vía `<html data-theme="dark">`. Todo reacciona solo si consume tokens.

### Test mental antes de mergear
> Si cambias `data-theme` de light a dark y algo se ve mal, hay un hex hardcodeado. Arréglalo.

### Toggle en código
```tsx
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  document.documentElement.setAttribute(
    'data-theme',
    current === 'dark' ? 'light' : 'dark'
  );
}
```

---

## 🚫 Reglas prohibidas (del BRAND manual)

1. ❌ Hex hardcodeado en componentes → siempre token
2. ❌ Emojis en UI permanente → usar Lucide Icons (1.5px stroke)
3. ❌ Gradientes, glassmorphism, blur decorativo, glow
4. ❌ Sombras decorativas en cards estáticas (solo modales y hovers)
5. ❌ Naranja como color semántico (warning/error) — es color de marca
6. ❌ Más de 3 pesos tipográficos en una pantalla
7. ❌ Uppercase sin tracking wide
8. ❌ Border-radius fuera de la escala (`sm 6`, `md 10`, `lg 14`, `xl 20`, `pill 999`)
9. ❌ Spacing arbitrario (solo tokens 1-12)
10. ❌ Mezclar con tokens de Streat Lab (rojo `#B01D23`, negro `#0a0a0a`, etc.)

---

## 📐 Regla del 60-30-10

- **60%** arena (fondos, superficies) → neutralidad cálida
- **30%** marino (estructura, KPIs, navegación) → ancla
- **10%** naranja + semánticos (CTAs, estados) → vida

> Si una pantalla supera el 15% de naranja, está mal diseñada. Respirar.

---

## 🔍 Iconografía

- **Librería:** Lucide Icons (outline, 1.5px stroke)
- **Tamaño:** 16px sidebar/botones · 20px KPI cards · 24px máximo
- **Color:** `currentColor` (hereda del contenedor), nunca hex directo
- **Stroke:** 1.5px consistente

```tsx
import { Package, MapPin, User } from 'lucide-react';

<Package size={16} strokeWidth={1.5} />
```

---

## 💰 Formato español

Siempre via helpers:

```tsx
import { fmtEur, fmtNum, fmtPct, fmtDate } from '@/styles/tokens';

fmtEur(4820.5)     // "4.820,50 €"
fmtNum(1000)       // "1.000"
fmtPct(12.4)       // "↑ 12.4%"
fmtPct(-2.3)       // "↓ 2.3%"
fmtDate(new Date()) // "22 abr"
```

---

## 📝 Microcopy

- **Sentence case siempre:** `Nuevo pedido`, no `Nuevo Pedido`
- **Verbos imperativos:** `Guardar`, `Confirmar`, `Cancelar`
- **Fechas:** `22 abr`, `lun 22`, `S17` (sin "del" ni "de")
- **Porcentajes:** `12.4%` con `↑`/`↓` explícito
- **Moneda:** `4.820 €` (símbolo a la derecha con espacio)

---

## 🔗 Codificación de operadores (análogo a canales de Streat Lab)

| Operador  | Familia    | Uso principal                           |
|-----------|------------|------------------------------------------|
| Mercadona | Naranja    | `bg-op-mercadona-bg` + `text-op-mercadona-fg` |
| Carrefour | Oliva      | `bg-op-carrefour-bg` + `text-op-carrefour-fg` |
| Lidl      | Ámbar      | `bg-op-lidl-bg` + `text-op-lidl-fg`       |
| Día       | Terracota  | `bg-op-dia-bg` + `text-op-dia-fg`         |

> Si aparece un 5º operador, usar Marino antes de inventar familias nuevas.

---

## 📋 Checklist antes de mergear UI

- [ ] ¿Todos los colores vienen de tokens (CSS vars o helpers TS)?
- [ ] ¿Funciona en light Y dark sin hex hardcodeados?
- [ ] ¿Los ALL CAPS llevan `tracking-wide` o `tracking-wider`?
- [ ] ¿Los pesos están en {400, 500, 700}?
- [ ] ¿Los radios y spacings usan tokens de la escala?
- [ ] ¿El naranja se usa como CTA, no como estado?
- [ ] ¿Al menos 60% de superficie es neutra (arena)?
- [ ] ¿Los iconos son Lucide outline a 1.5px?
- [ ] ¿El microcopy está en sentence case y formato español?
- [ ] ¿Nada heredado de Streat Lab?

---

## 📅 Versión

| Versión | Fecha          | Cambios                                |
|---------|----------------|----------------------------------------|
| 1.0     | 22 abr 2026    | Inicial — tema Marino + Fuego · MEDI   |
