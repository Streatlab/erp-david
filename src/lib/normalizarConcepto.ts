export function normalizar(s: string): string {
  return s.toLowerCase().trim();
}

export function normalizarConcepto(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/^\s*\d{16}\s+/, "")
    .replace(/\|\s*\d{16}\s*\d*\s*$/, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchPatron(concepto: string, patron: string): boolean {
  if (!concepto || !patron) return false;
  return concepto.includes(patron.toLowerCase().trim());
}
