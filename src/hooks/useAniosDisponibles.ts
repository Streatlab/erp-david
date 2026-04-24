export function useAniosDisponibles(): number[] {
  const actual = new Date().getFullYear();
  return [actual - 2, actual - 1, actual];
}
