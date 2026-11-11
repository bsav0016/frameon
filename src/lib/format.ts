/** Formatting and validation helpers shared across screens. Pure functions, covered by unit tests. */

export function formatDate(value: Date): string {
  return value.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function timeAgo(value: Date, now: Date = new Date()): string {
  const seconds = Math.max(0, Math.floor((now.getTime() - value.getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return value.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export const average = (values: number[]) => (values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length);

/** Money is stored as integer cents everywhere to avoid floating point errors. */
export const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export function formatCount(count: number, singular: string) {
  const label = count === 1 ? singular : `${singular}s`;
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M ${label}`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}k ${label}`;
  return `${count} ${label}`;
}

export type ParsedSaleFields = { priceCents: number; quantity: number } | { error: { title: string; message: string } };

/** Price and quantity are optional, but must be given together. Blank means "not for sale". */
export function parseSaleFields(priceText: string, quantityText: string): ParsedSaleFields {
  const priceTrim = priceText.trim();
  const quantityTrim = quantityText.trim();
  const fail = (title: string, message: string) => ({ error: { title, message } });
  let priceCents: number | null = null;
  let quantity: number | null = null;

  if (priceTrim !== '') {
    if (!/^(\d+\.?\d*|\.\d+)$/.test(priceTrim)) return fail('Price Error', 'Price must be a number or left blank');
    if (priceTrim.includes('.') && priceTrim.split('.')[1].length > 2) return fail('Price Error', 'Too many digits after the decimal point');
    priceCents = Math.round(Number(priceTrim) * 100);
    if (priceCents < 50) return fail('Price Error', 'The minimum price is $0.50');
    if (priceCents > 1_000_000) return fail('Price Error', 'The maximum price is $10,000');
  }
  if (quantityTrim !== '') {
    if (!/^\d+$/.test(quantityTrim) || Number(quantityTrim) < 1) return fail('Quantity Error', 'Quantity must be a positive whole number or left blank');
    if (Number(quantityTrim) > 10_000) return fail('Quantity Error', 'The maximum quantity is 10,000');
    quantity = Number(quantityTrim);
  }
  if (priceCents !== null && quantity === null) return fail('Price Error', 'Cannot have a price without a quantity');
  if (quantity !== null && priceCents === null) return fail('Quantity Error', 'Cannot have a quantity without a price');
  return { priceCents: priceCents ?? 0, quantity: quantity ?? 0 };
}

export type Country = 'US' | 'CA';

export function validateAddress(a: { name: string; line1: string; city: string; state: string; postalCode: string; country: Country | '' }) {
  if (![a.name, a.line1, a.city, a.state, a.postalCode].every((v) => v.trim() !== '')) return 'Please fill all required fields';
  if (!/^[A-Za-z]{2}$/.test(a.state.trim())) return 'State must be a 2 letter abbreviation';
  if (a.country === 'US') {
    if (!/^\d{5}$/.test(a.postalCode.trim())) return 'ZIP code must be 5 digits';
  } else if (a.country === 'CA') {
    if (!/^[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d$/.test(a.postalCode.trim())) return 'Postal code must look like K1A 0B1';
  } else return 'Please select a country';
  return null;
}
