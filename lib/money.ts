const cad = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatMoney(value: number): string {
  return cad.format(value);
}

export function formatPct(value: number, fractionDigits = 2): string {
  return `${value.toFixed(fractionDigits)}%`;
}
