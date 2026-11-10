export function formatBs(cents: number): string {
  return `Bs ${(Math.abs(cents) / 100).toFixed(2).replace(".", ",")}`;
}

/** Typed Bs text ("120,50" or "120.5") to cents; null when it is not a valid amount. */
export function parseBsToCents(text: string): number | null {
  const normalized = text.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Math.round(Number(normalized) * 100);
}

export type BalanceTone = "credit" | "debt" | "settled";

/** Same wording in the balances list and in the payment hint. */
export function describeBalance(cents: number): { label: string; tone: BalanceTone } {
  if (cents > 0) return { label: `Le deben ${formatBs(cents)}`, tone: "credit" };
  if (cents < 0) return { label: `Debe ${formatBs(cents)}`, tone: "debt" };
  return { label: "Al día", tone: "settled" };
}

/** Sum of the typed custom shares; invalid or empty fields count as zero. */
export function sumTypedAmounts(values: string[]): number {
  return values.reduce((total, value) => total + (parseBsToCents(value) ?? 0), 0);
}
