const eur = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' });

export function formatPrice(value: number): string {
  return eur.format(value);
}
