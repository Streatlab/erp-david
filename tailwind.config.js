/** @type {import('tailwindcss').Config} */
// ============================================================
// DAVID ERP — TAILWIND CONFIG
// v1.0 — Marino + Fuego · Mediterráneo vivo
// ------------------------------------------------------------
// Todos los colores leen de CSS vars definidas en
// src/styles/design-tokens.css. Esto garantiza que el modo
// oscuro se active solo con [data-theme="dark"] en <html>.
//
// NO MEZCLAR con Tailwind config de Streat Lab (Binagre).
// ============================================================

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // ——— COLORES ———
      colors: {
        // Ramps principales (via CSS vars para que reaccionen al theme)
        sand: {
          50:  "var(--sand-50)",
          100: "var(--sand-100)",
          200: "var(--sand-200)",
          300: "var(--sand-300)",
          400: "var(--sand-400)",
          700: "var(--sand-700)",
          900: "var(--sand-900)",
        },
        marino: {
          50:  "var(--marino-50)",
          100: "var(--marino-100)",
          300: "var(--marino-300)",
          500: "var(--marino-500)",
          700: "var(--marino-700)",
          900: "var(--marino-900)",
        },
        naranja: {
          50:  "var(--naranja-50)",
          100: "var(--naranja-100)",
          300: "var(--naranja-300)",
          500: "var(--naranja-500)",
          700: "var(--naranja-700)",
          900: "var(--naranja-900)",
        },
        terra: {
          50:  "var(--terra-50)",
          100: "var(--terra-100)",
          300: "var(--terra-300)",
          500: "var(--terra-500)",
          700: "var(--terra-700)",
          900: "var(--terra-900)",
        },
        ambar: {
          50:  "var(--ambar-50)",
          100: "var(--ambar-100)",
          300: "var(--ambar-300)",
          500: "var(--ambar-500)",
          700: "var(--ambar-700)",
          900: "var(--ambar-900)",
        },
        oliva: {
          50:  "var(--oliva-50)",
          100: "var(--oliva-100)",
          300: "var(--oliva-300)",
          500: "var(--oliva-500)",
          700: "var(--oliva-700)",
          900: "var(--oliva-900)",
        },

        // Tokens semánticos (se usan así: bg-surface, text-primary, etc.)
        bg: {
          app:        "var(--bg-app)",
          surface:    "var(--bg-surface)",
          "surface-alt": "var(--bg-surface-alt)",
          overlay:    "var(--bg-overlay)",
        },
        text: {
          primary:      "var(--text-primary)",
          secondary:    "var(--text-secondary)",
          tertiary:     "var(--text-tertiary)",
          "on-primary": "var(--text-on-primary)",
          "on-accent":  "var(--text-on-accent)",
        },
        border: {
          subtle:  "var(--border-subtle)",
          default: "var(--border-default)",
          strong:  "var(--border-strong)",
        },
        brand: {
          primary:       "var(--brand-primary)",
          "primary-hover": "var(--brand-primary-hover)",
          accent:        "var(--brand-accent)",
          "accent-hover": "var(--brand-accent-hover)",
        },

        // Semánticos (success, warning, danger, info)
        success: {
          DEFAULT: "var(--success)",
          bg:      "var(--success-bg)",
          border:  "var(--success-border)",
          text:    "var(--success-text)",
        },
        warning: {
          DEFAULT: "var(--warning)",
          bg:      "var(--warning-bg)",
          border:  "var(--warning-border)",
          text:    "var(--warning-text)",
        },
        danger: {
          DEFAULT: "var(--danger)",
          bg:      "var(--danger-bg)",
          border:  "var(--danger-border)",
          text:    "var(--danger-text)",
        },
        info: {
          DEFAULT: "var(--info)",
          bg:      "var(--info-bg)",
          border:  "var(--info-border)",
          text:    "var(--info-text)",
        },

        // Operadores (mercadona, carrefour, lidl, dia)
        op: {
          "mercadona-fg": "var(--op-mercadona-fg)",
          "mercadona-bg": "var(--op-mercadona-bg)",
          "mercadona-bd": "var(--op-mercadona-bd)",
          "carrefour-fg": "var(--op-carrefour-fg)",
          "carrefour-bg": "var(--op-carrefour-bg)",
          "carrefour-bd": "var(--op-carrefour-bd)",
          "lidl-fg":      "var(--op-lidl-fg)",
          "lidl-bg":      "var(--op-lidl-bg)",
          "lidl-bd":      "var(--op-lidl-bd)",
          "dia-fg":       "var(--op-dia-fg)",
          "dia-bg":       "var(--op-dia-bg)",
          "dia-bd":       "var(--op-dia-bd)",
        },
      },

      // ——— TIPOGRAFÍA ———
      fontFamily: {
        sans: ['Inter', 'Geist', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        "2xs":  ["10px", { lineHeight: "1.35" }],
        xs:     ["11px", { lineHeight: "1.35" }],
        sm:     ["13px", { lineHeight: "1.55" }],
        base:   ["14px", { lineHeight: "1.55" }],
        md:     ["16px", { lineHeight: "1.55" }],
        lg:     ["20px", { lineHeight: "1.35" }],
        xl:     ["28px", { lineHeight: "1.15" }],
        "2xl":  ["40px", { lineHeight: "1.15" }],
      },
      fontWeight: {
        regular: "400",
        medium:  "500",
        bold:    "700",
      },
      letterSpacing: {
        tight:  "-0.01em",
        normal: "0",
        wide:   "0.08em",
        wider:  "0.14em",
      },
      lineHeight: {
        tight:  "1.15",
        snug:   "1.35",
        normal: "1.55",
      },

      // ——— SPACING ———
      spacing: {
        1:  "4px",
        2:  "8px",
        3:  "12px",
        4:  "16px",
        5:  "20px",
        6:  "24px",
        8:  "32px",
        10: "40px",
        12: "48px",
      },

      // ——— RADIOS ———
      borderRadius: {
        sm:   "6px",
        md:   "10px",
        lg:   "14px",
        xl:   "20px",
        pill: "999px",
      },

      // ——— SOMBRAS ———
      boxShadow: {
        none:  "none",
        xs:    "var(--shadow-xs)",
        sm:    "var(--shadow-sm)",
        md:    "var(--shadow-md)",
        modal: "var(--shadow-modal)",
      },

      // ——— MOTION ———
      transitionTimingFunction: {
        "out-soft":  "cubic-bezier(0.22, 1, 0.36, 1)",
        "in-out-soft": "cubic-bezier(0.65, 0, 0.35, 1)",
      },
      transitionDuration: {
        fast: "120ms",
        base: "200ms",
        slow: "320ms",
      },
    },
  },
  plugins: [],
};
