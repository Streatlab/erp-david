// ============================================================
// DAVID ERP — DESIGN TOKENS (TypeScript)
// v1.0 — Marino + Fuego · Mediterráneo vivo
// ------------------------------------------------------------
// FUENTE ÚNICA DE VERDAD para estilos del ERP DavidReparte.
// NO MEZCLAR con tokens de Streat Lab / Binagre.
// Todo componente debe consumir estos tokens, nunca hardcodear.
// ============================================================

import { useEffect, useState } from "react";

// ——————————————————————————————————————————————————————
// TEMA (light/dark)
// ——————————————————————————————————————————————————————

export type Theme = "light" | "dark";

export function useThemeMode(): Theme {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof document === "undefined") return "light";
    return (document.documentElement.getAttribute("data-theme") as Theme) || "light";
  });

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const newTheme = (document.documentElement.getAttribute("data-theme") as Theme) || "light";
      setTheme(newTheme);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  return theme;
}

// ——————————————————————————————————————————————————————
// TOKEN SET (forma Binagre: { T, isDark })
// Compat layer para módulos portados desde Binagre que consumen
// `const { T, isDark } = useTheme()` + acceso directo `T.bg`, `T.pri`, etc.
// Derivado de los tokens semánticos David para mantener paleta coherente.
// ——————————————————————————————————————————————————————

export interface TokenSet {
  bg: string;
  group: string;
  card: string;
  brd: string;
  pri: string;
  sec: string;
  mut: string;
  inp: string;
  emphasis: string;
  accent: string;
}

function tokenSetFromTheme(theme: Theme): TokenSet {
  const t = getTokens(theme);
  return {
    bg: t.bgApp,
    group: t.bgSurfaceAlt,
    card: t.bgSurface,
    brd: t.borderDefault,
    pri: t.textPrimary,
    sec: t.textSecondary,
    mut: t.textTertiary,
    inp: t.bgSurface,
    emphasis: t.brandAccent,
    accent: t.brandAccent,
  };
}

export function useTheme(): { T: TokenSet; isDark: boolean } {
  const theme = useThemeMode();
  return { T: tokenSetFromTheme(theme), isDark: theme === "dark" };
}

// ——————————————————————————————————————————————————————
// CROMÁTICA BASE — ramps completos (50→900)
// ——————————————————————————————————————————————————————

export const PALETTE = {
  light: {
    // Tierra + arena — fondos y superficies cálidas
    sand: {
      50: "#FDF8EC",
      100: "#F9F1DE",
      200: "#F5ECD9",
      300: "#EDE1C4",
      400: "#D9C9A3",
      700: "#7A5A3A",
      900: "#1C1A14",
    },
    // Marino — ancla, confianza, primario
    marino: {
      50: "#E6ECF4",
      100: "#C2CFE0",
      300: "#4D6A92",
      500: "#16355C", // ⭐ principal
      700: "#0D2340",
      900: "#061428",
    },
    // Naranja Valencia — acento vivo, CTA
    naranja: {
      50: "#FDE8D5",
      100: "#FBD2AD",
      300: "#F7A668",
      500: "#F26B1F", // ⭐ acento
      700: "#B84A0E",
      900: "#7A3008",
    },
    // Terracota — alerta suave / caídas
    terra: {
      50: "#FBE4DD",
      100: "#F5C1B0",
      300: "#E48369",
      500: "#C94A2C",
      700: "#8F2E17",
      900: "#5C1C0D",
    },
    // Ámbar miel — warning / en progreso
    ambar: {
      50: "#FDF1D5",
      100: "#FBE3A8",
      300: "#F8CA6E",
      500: "#F5B84A",
      700: "#A87A1E",
      900: "#6E4E10",
    },
    // Oliva — éxito / fresh
    oliva: {
      50: "#EEF1DC",
      100: "#D8DFA9",
      300: "#A3B268",
      500: "#7A8C3E",
      700: "#53621F",
      900: "#334010",
    },
  },
  dark: {
    sand: {
      50: "#19222E",
      100: "#141C26",
      200: "#0F1620",
      300: "#232D3A",
      400: "#2E3A4A",
      700: "#A89878",
      900: "#F5ECD9",
    },
    marino: {
      50: "#1A2B42",
      100: "#264062",
      300: "#4F7AAD",
      500: "#6FA8E0", // pivota a celeste en dark
      700: "#A5CAEA",
      900: "#D4E3F2",
    },
    naranja: {
      50: "#3A1F0C",
      100: "#5A2F10",
      300: "#C76624",
      500: "#FF8A3D", // aviva en dark
      700: "#FFB47A",
      900: "#FDD4B0",
    },
    terra: {
      50: "#3A1812",
      100: "#5A2418",
      300: "#B4543A",
      500: "#E8765C",
      700: "#F0A090",
      900: "#F7CDC1",
    },
    ambar: {
      50: "#3A2A0C",
      100: "#5A3F12",
      300: "#C79332",
      500: "#F5C56D",
      700: "#F5D78C",
      900: "#F7E5B4",
    },
    oliva: {
      50: "#1F2810",
      100: "#2F3C17",
      300: "#7F9040",
      500: "#A8B86B",
      700: "#C8D98B",
      900: "#E0EBB5",
    },
  },
} as const;

// ——————————————————————————————————————————————————————
// TOKENS SEMÁNTICOS (reactivos al tema)
// ——————————————————————————————————————————————————————

export function getTokens(theme: Theme) {
  const p = PALETTE[theme];

  return {
    // Fondos
    bgApp: p.sand[200],
    bgSurface: p.sand[50],
    bgSurfaceAlt: p.sand[100],
    bgOverlay: theme === "light" ? "rgba(12, 20, 30, 0.55)" : "rgba(0, 0, 0, 0.75)",

    // Texto
    textPrimary: p.sand[900],
    textSecondary: p.sand[700],
    textTertiary: theme === "light" ? "#A89472" : "#6E6250",
    textOnPrimary: p.sand[50],
    textOnAccent: p.sand[50],

    // Bordes
    borderSubtle: theme === "light" ? "rgba(22, 53, 92, 0.08)" : "rgba(255, 255, 255, 0.06)",
    borderDefault: theme === "light" ? "rgba(22, 53, 92, 0.14)" : "rgba(255, 255, 255, 0.10)",
    borderStrong: theme === "light" ? "rgba(22, 53, 92, 0.28)" : "rgba(255, 255, 255, 0.18)",

    // Marca
    brandPrimary: p.marino[500],
    brandPrimaryHover: theme === "light" ? p.marino[700] : p.marino[300],
    brandAccent: p.naranja[500],
    brandAccentHover: theme === "light" ? p.naranja[700] : p.naranja[300],

    // Semánticos
    success: p.oliva[500],
    successBg: p.oliva[50],
    successBorder: p.oliva[300],
    successText: p.oliva[700],

    warning: p.ambar[500],
    warningBg: p.ambar[50],
    warningBorder: p.ambar[300],
    warningText: p.ambar[700],

    danger: p.terra[500],
    dangerBg: p.terra[50],
    dangerBorder: p.terra[300],
    dangerText: p.terra[700],

    info: p.marino[500],
    infoBg: p.marino[50],
    infoBorder: p.marino[300],
    infoText: p.marino[700],

    // Sombras (planas por diseño)
    shadowNone: "none",
    shadowXs: theme === "light" ? "0 1px 2px rgba(22, 53, 92, 0.04)" : "0 1px 2px rgba(0, 0, 0, 0.25)",
    shadowSm: theme === "light" ? "0 2px 6px rgba(22, 53, 92, 0.06)" : "0 2px 6px rgba(0, 0, 0, 0.35)",
    shadowMd: theme === "light" ? "0 8px 24px rgba(22, 53, 92, 0.10)" : "0 8px 24px rgba(0, 0, 0, 0.45)",
    shadowModal: theme === "light" ? "0 20px 48px rgba(12, 20, 30, 0.20)" : "0 20px 48px rgba(0, 0, 0, 0.65)",
  };
}

// ——————————————————————————————————————————————————————
// OPERADORES (replica del sistema de canales de Streat Lab)
// Mercadona, Carrefour, Lidl, Día — cada uno con su familia
// ——————————————————————————————————————————————————————

export type Operador = "mercadona" | "carrefour" | "lidl" | "dia";

export const OPERADORES: Operador[] = ["mercadona", "carrefour", "lidl", "dia"];

export function getOperadorStyle(operador: Operador, theme: Theme) {
  const p = PALETTE[theme];

  const MAP = {
    mercadona: {
      fg: theme === "light" ? p.naranja[700] : "#FFB47A",
      bg: theme === "light" ? "rgba(242, 107, 31, 0.12)" : "rgba(255, 138, 61, 0.14)",
      bd: theme === "light" ? "rgba(242, 107, 31, 0.30)" : "rgba(255, 138, 61, 0.35)",
    },
    carrefour: {
      fg: theme === "light" ? p.oliva[700] : "#C8D98B",
      bg: theme === "light" ? "rgba(122, 140, 62, 0.14)" : "rgba(168, 184, 107, 0.14)",
      bd: theme === "light" ? "rgba(122, 140, 62, 0.30)" : "rgba(168, 184, 107, 0.35)",
    },
    lidl: {
      fg: theme === "light" ? p.ambar[700] : "#F5D78C",
      bg: theme === "light" ? "rgba(245, 184, 74, 0.18)" : "rgba(245, 197, 109, 0.16)",
      bd: theme === "light" ? "rgba(245, 184, 74, 0.40)" : "rgba(245, 197, 109, 0.40)",
    },
    dia: {
      fg: theme === "light" ? p.terra[700] : "#F0A090",
      bg: theme === "light" ? "rgba(201, 74, 44, 0.12)" : "rgba(232, 118, 92, 0.14)",
      bd: theme === "light" ? "rgba(201, 74, 44, 0.30)" : "rgba(232, 118, 92, 0.35)",
    },
  };

  return MAP[operador];
}

// ——————————————————————————————————————————————————————
// TIPOGRAFÍA
// ——————————————————————————————————————————————————————

export const FONT = {
  sans: '"Inter", "Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, system-ui, sans-serif',
  mono: '"JetBrains Mono", "Fira Code", ui-monospace, SFMono-Regular, Menlo, monospace',
  // Compat Binagre: body = Lexend, heading/title/pageTitle = Oswald
  body: 'Lexend, "Inter", sans-serif',
  heading: 'Oswald, "Inter", sans-serif',
  title: 'Oswald, "Inter", sans-serif',
  pageTitle: 'Oswald, "Inter", sans-serif',
} as const;

export const FS = {
  "2xs": "10px", // labels micro, badges
  xs: "11px",    // labels ALL CAPS, meta
  sm: "13px",    // texto secundario, tablas
  base: "14px",  // cuerpo
  md: "16px",    // subtítulos
  lg: "20px",    // KPI secundario
  xl: "28px",    // KPI principal
  "2xl": "40px", // hero metric
} as const;

export const FW = {
  regular: 400,
  medium: 500,
  bold: 700,
} as const;

export const TRACKING = {
  tight: "-0.01em",
  normal: "0",
  wide: "0.08em",    // labels ALL CAPS
  wider: "0.14em",   // section headers
} as const;

export const LEADING = {
  tight: 1.15,
  snug: 1.35,
  normal: 1.55,
} as const;

// ——————————————————————————————————————————————————————
// LAYOUT & SPACING (escala 4px)
// ——————————————————————————————————————————————————————

export const SPACE = {
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  5: "20px",
  6: "24px",
  8: "32px",
  10: "40px",
  12: "48px",
} as const;

export const RADIUS = {
  sm: "6px",
  md: "10px",
  lg: "14px",
  xl: "20px",
  pill: "999px",
} as const;

export const LAYOUT = {
  sidebarW: "240px",
  sidebarWCollapsed: "56px",
  containerPad: "24px",
} as const;

// ——————————————————————————————————————————————————————
// MOTION
// ——————————————————————————————————————————————————————

export const MOTION = {
  easeOut: "cubic-bezier(0.22, 1, 0.36, 1)",
  easeInOut: "cubic-bezier(0.65, 0, 0.35, 1)",
  durFast: "120ms",
  durBase: "200ms",
  durSlow: "320ms",
} as const;

// ——————————————————————————————————————————————————————
// ESTILOS PRE-COMPUESTOS (helpers comunes)
// Consumen tokens semánticos según tema activo
// ——————————————————————————————————————————————————————

import type { CSSProperties } from "react";

/** Card base — fondo surface, borde default, radio lg.
 *  Polimórfico: acepta Theme (David) o TokenSet (Binagre compat). */
export function cardStyle(theme: Theme): CSSProperties;
export function cardStyle(T: TokenSet): CSSProperties;
export function cardStyle(arg: Theme | TokenSet): CSSProperties {
  if (typeof arg === "string") {
    const t = getTokens(arg);
    return {
      background: t.bgSurface,
      border: `0.5px solid ${t.borderDefault}`,
      borderRadius: RADIUS.lg,
      padding: SPACE[6],
    };
  }
  return {
    background: arg.card,
    border: `0.5px solid ${arg.brd}`,
    borderRadius: 10,
    padding: "14px 16px",
  };
}

/** Título de sección — ALL CAPS, tracking wider, color accent */
export function sectionTitleStyle(theme: Theme): CSSProperties {
  const t = getTokens(theme);
  return {
    fontSize: FS.xs,
    letterSpacing: TRACKING.wider,
    color: t.brandAccent,
    fontWeight: FW.bold,
    textTransform: "uppercase",
  };
}

/** Label micro — ALL CAPS, tracking wide, color secondary */
export function labelStyle(theme: Theme): CSSProperties {
  const t = getTokens(theme);
  return {
    fontSize: FS["2xs"],
    letterSpacing: TRACKING.wide,
    color: t.textSecondary,
    fontWeight: FW.medium,
    textTransform: "uppercase",
  };
}

/** KPI número grande — tight, bold, color primary */
export function kpiStyle(theme: Theme): CSSProperties {
  const t = getTokens(theme);
  return {
    fontSize: FS.xl,
    fontWeight: FW.bold,
    color: t.textPrimary,
    lineHeight: LEADING.tight,
    letterSpacing: TRACKING.tight,
  };
}

/** Botón primario (CTA) — naranja */
export function btnPrimaryStyle(theme: Theme): CSSProperties {
  const t = getTokens(theme);
  return {
    background: t.brandAccent,
    color: t.textOnAccent,
    padding: `${SPACE[2]} ${SPACE[4]}`,
    borderRadius: RADIUS.md,
    border: "0.5px solid transparent",
    fontSize: FS.sm,
    fontWeight: FW.medium,
    fontFamily: FONT.sans,
    cursor: "pointer",
    transition: `background ${MOTION.durFast} ${MOTION.easeOut}, transform ${MOTION.durFast} ${MOTION.easeOut}`,
  };
}

/** Botón secundario — outline marino */
export function btnSecondaryStyle(theme: Theme): CSSProperties {
  const t = getTokens(theme);
  return {
    background: "transparent",
    color: t.brandPrimary,
    padding: `${SPACE[2]} ${SPACE[4]}`,
    borderRadius: RADIUS.md,
    border: `0.5px solid ${t.brandPrimary}`,
    fontSize: FS.sm,
    fontWeight: FW.medium,
    fontFamily: FONT.sans,
    cursor: "pointer",
    transition: `background ${MOTION.durFast} ${MOTION.easeOut}`,
  };
}

/** Botón ghost — transparente */
export function btnGhostStyle(theme: Theme): CSSProperties {
  const t = getTokens(theme);
  return {
    background: "transparent",
    color: t.textSecondary,
    padding: `${SPACE[2]} ${SPACE[4]}`,
    borderRadius: RADIUS.md,
    border: "0.5px solid transparent",
    fontSize: FS.sm,
    fontWeight: FW.medium,
    fontFamily: FONT.sans,
    cursor: "pointer",
    transition: `background ${MOTION.durFast} ${MOTION.easeOut}`,
  };
}

/** Badge genérico — pill pequeña */
export function badgeStyle(
  theme: Theme,
  variant: "marino" | "naranja" | "oliva" | "ambar" | "terra" = "marino"
): CSSProperties {
  const p = PALETTE[theme];
  const MAP = {
    marino: { bg: p.marino[500], fg: p.sand[50] },
    naranja: { bg: p.naranja[500], fg: p.sand[50] },
    oliva: { bg: p.oliva[500], fg: p.sand[50] },
    ambar: { bg: p.ambar[500], fg: p.ambar[900] },
    terra: { bg: p.terra[500], fg: p.sand[50] },
  };
  return {
    display: "inline-flex",
    alignItems: "center",
    fontSize: FS["2xs"],
    fontWeight: FW.bold,
    letterSpacing: TRACKING.wide,
    padding: "3px 10px",
    borderRadius: RADIUS.pill,
    textTransform: "uppercase",
    background: MAP[variant].bg,
    color: MAP[variant].fg,
  };
}

/** Semáforo — devuelve color según signo (+ oliva, - terra, 0 marino) */
export function semaforoColor(theme: Theme, valor: number): string {
  const t = getTokens(theme);
  if (valor > 0) return t.success;
  if (valor < 0) return t.danger;
  return t.info;
}

/** Group style — separador visual entre secciones */
export function groupStyle(theme: Theme): CSSProperties {
  const t = getTokens(theme);
  return {
    borderTop: `0.5px solid ${t.borderSubtle}`,
    paddingTop: SPACE[6],
    marginTop: SPACE[6],
  };
}

/** Estilo para cards tintadas por operador */
export function cardOperadorStyle(theme: Theme, operador: Operador): CSSProperties {
  const op = getOperadorStyle(operador, theme);
  return {
    background: op.bg,
    border: `0.5px solid ${op.bd}`,
    borderRadius: RADIUS.md,
    padding: SPACE[4],
  };
}

// ——————————————————————————————————————————————————————
// FORMATEADORES (consistencia española)
// ——————————————————————————————————————————————————————

/** Formato moneda: 4.820,50 € */
export function fmtEur(valor: number | null | undefined, decimales = 2): string {
  if (valor == null || isNaN(valor)) return "— €";
  return (
    valor
      .toLocaleString("es-ES", {
        minimumFractionDigits: decimales,
        maximumFractionDigits: decimales,
      }) + " €"
  );
}

/** Formato número entero: 1.000 */
export function fmtNum(valor: number | null | undefined, decimales = 0): string {
  if (valor == null || isNaN(valor)) return "—";
  return valor.toLocaleString("es-ES", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
}

/** Formato porcentaje con signo: ↑ 12.4% / ↓ 2.3% */
export function fmtPct(valor: number | null | undefined, decimales = 1): string {
  if (valor == null || isNaN(valor)) return "—";
  const signo = valor > 0 ? "↑" : valor < 0 ? "↓" : "";
  return `${signo} ${Math.abs(valor).toFixed(decimales)}%`;
}

/** Formato fecha abreviada: 22 abr */
export function fmtDate(fecha: Date | string | null | undefined): string {
  if (!fecha) return "—";
  const d = typeof fecha === "string" ? new Date(fecha) : fecha;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

/** Formato fecha completa: lun 22 abr */
export function fmtDateFull(fecha: Date | string | null | undefined): string {
  if (!fecha) return "—";
  const d = typeof fecha === "string" ? new Date(fecha) : fecha;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

// ——————————————————————————————————————————————————————
// COMPAT HELPERS BINAGRE (consumen TokenSet)
// Añadidos para módulos portados que esperan estas signatures.
// ——————————————————————————————————————————————————————

export const kpiLabelStyle = (T: TokenSet): CSSProperties => ({
  fontFamily: FONT.heading,
  fontSize: 12,
  letterSpacing: "2px",
  textTransform: "uppercase",
  color: T.mut,
});

export const kpiValueStyle = (T: TokenSet): CSSProperties => ({
  fontFamily: FONT.heading,
  fontSize: "2.4rem",
  fontWeight: 600,
  color: T.pri,
  lineHeight: 1,
});

export const tabActiveStyle = (_isDark: boolean): CSSProperties => ({
  padding: "6px 14px",
  borderRadius: 6,
  border: "none",
  background: "var(--brand-accent)",
  color: "#ffffff",
  fontFamily: FONT.body,
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
  transition: "background 150ms",
});

export const tabInactiveStyle = (T: TokenSet): CSSProperties => ({
  padding: "6px 14px",
  borderRadius: 6,
  border: `0.5px solid ${T.brd}`,
  background: "none",
  color: T.sec,
  fontFamily: FONT.body,
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
  transition: "background 150ms",
});
