export type AmountKind = "income" | "expense" | "zero";

export function amountKind(cents: number): AmountKind {
  if (cents > 0) return "income";
  if (cents < 0) return "expense";
  return "zero";
}
