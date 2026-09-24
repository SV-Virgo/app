// Splits a "€50,00"-style amount into `parts` shares in whole cents, any
// leftover cent(s) going to the first share(s), so the parts always sum
// back to exactly the original amount (no rounding drift). Mirrors the
// parseEuroAmount parsing in functions/index.js.
export function splitEuroAmount(amount: string, parts: number): string[] {
  const cleaned = amount.replace(/[^\d,.-]/g, '').replace(',', '.');
  const cents = Math.round(Number.parseFloat(cleaned) * 100);
  const base = Math.floor(cents / parts);
  const remainder = cents - base * parts;
  return Array.from({ length: parts }, (_, i) => formatEuroCents(base + (i < remainder ? 1 : 0)));
}

function formatEuroCents(cents: number): string {
  return `€${(cents / 100).toFixed(2).replace('.', ',')}`;
}
