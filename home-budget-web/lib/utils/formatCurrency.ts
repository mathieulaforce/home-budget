export function formatCurrency(cents: number, currency = "EUR"): string {
  return new Intl.NumberFormat("nl-BE", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

export function parseCentsFromInput(value: string): number {
  const float = parseFloat(value.replace(",", "."));
  if (isNaN(float)) throw new Error(`Invalid currency value: "${value}"`);
  return Math.round(float * 100);
}
