import { getTokens, useTheme, FONT, FS, RADIUS, SPACE } from "@/styles/tokens";

interface Props {
  value: string;
  onChange: (v: string) => void;
  options?: { value: string; label: string }[];
}

export default function SelectorPeriodoDropdown({ value, onChange, options }: Props) {
  const theme = useTheme();
  const t = getTokens(theme);
  const opts = options ?? [
    { value: "mes", label: "Mes actual" },
    { value: "anio", label: "Año actual" },
    { value: "todo", label: "Todo" },
  ];

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        background: t.bgSurface,
        color: t.textPrimary,
        border: `0.5px solid ${t.borderDefault}`,
        borderRadius: RADIUS.md,
        padding: `${SPACE[2]} ${SPACE[3]}`,
        fontFamily: FONT.sans,
        fontSize: FS.sm,
        cursor: "pointer",
      }}
    >
      {opts.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
