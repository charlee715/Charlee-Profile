export function dateValue(value: string) {
  const [yearText, monthText = "0"] = value.trim().split(/[/-]/);
  const year = Number(yearText);
  const month = Number(monthText);

  if (!Number.isFinite(year)) return 0;
  return year * 100 + (Number.isFinite(month) ? month : 0);
}

export function newestFirst<T extends { year: string }>(items: readonly T[]) {
  return [...items].sort((a, b) => dateValue(b.year) - dateValue(a.year));
}
