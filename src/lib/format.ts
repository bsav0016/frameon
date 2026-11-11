import type { Post } from './types';

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/** Timestamps are stored as strings. New ones are ISO; the Swift app wrote "Nov 10, 2021 at 3:45 PM". */
export function parseDate(value: string): Date {
  const iso = new Date(value);
  if (!Number.isNaN(iso.getTime())) return iso;
  const m = value.match(/^(\w{3})\w*\s+(\d{1,2}),\s+(\d{4}).*?(\d{1,2}):(\d{2})\s*([AP]M)?/i);
  if (m) {
    const month = MONTHS.indexOf(m[1].toLowerCase());
    let hour = Number(m[4]);
    const meridiem = m[6]?.toUpperCase();
    if (meridiem === 'PM' && hour < 12) hour += 12;
    if (meridiem === 'AM' && hour === 12) hour = 0;
    if (month >= 0) return new Date(Number(m[3]), month, Number(m[2]), hour, Number(m[5]));
  }
  return new Date();
}

export const nowString = () => new Date().toISOString();

export function formatDate(value: string): string {
  return parseDate(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export const average = (values: number[]) =>
  values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;

export const formatPrice = (price: number) => `$${price.toFixed(2)}`;

export function formatCount(count: number, singular: string) {
  const label = count === 1 ? singular : `${singular}s`;
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M ${label}`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}k ${label}`;
  return `${count} ${label}`;
}

export const isForSale = (post: Post) => post.price > 0 && post.quantity > 0;

export function newId(prefix: string) {
  return `${prefix}_${Math.floor(Math.random() * 1000)}_${Date.now() / 1000}`;
}

export type ParsedSaleFields = { price: number; quantity: number } | { error: { title: string; message: string } };

/** Price and quantity are both optional, but must be given together. Blank means "not for sale". */
export function parseSaleFields(priceText: string, quantityText: string): ParsedSaleFields {
  const priceTrim = priceText.trim();
  const quantityTrim = quantityText.trim();
  const fail = (title: string, message: string) => ({ error: { title, message } });
  let price = -1;
  let quantity = -1;
  if (priceTrim !== '') {
    if (!/^\d*\.?\d+$|^\d+\.$/.test(priceTrim) || Number.isNaN(Number(priceTrim)))
      return fail('Price Error', 'Price must be a number or left blank');
    if (priceTrim.includes('.') && priceTrim.split('.')[1].length > 2)
      return fail('Price Error', 'Too many digits after the decimal point');
    price = Number(priceTrim);
  }
  if (quantityTrim !== '') {
    if (!/^\d+$/.test(quantityTrim)) return fail('Quantity Error', 'Quantity must be a positive integer or left blank');
    quantity = Number(quantityTrim);
  }
  if (price !== -1 && quantity === -1) return fail('Price Error', 'Cannot have a price without a quantity');
  if (quantity !== -1 && price === -1) return fail('Quantity Error', 'Cannot have a quantity without a price');
  return { price: price === -1 ? 0 : price, quantity: quantity === -1 ? 0 : quantity };
}

export function validateAddress(a: { name: string; line1: string; city: string; state: string; postalCode: string; country: string }) {
  if (![a.name, a.line1, a.city, a.state, a.postalCode].every((v) => v.trim() !== '')) return 'Please fill all required fields';
  if (!/^[A-Za-z]{2}$/.test(a.state.trim())) return 'State Must Be 2 Letter Abbreviation';
  if (a.country === 'US') {
    if (!/^\d{5}$/.test(a.postalCode.trim())) return 'Postal Code Must Be 5 Digits';
  } else if (a.country === 'CAN') {
    if (a.postalCode.trim().length !== 6) return 'Postal Code Must Be 6 Characters';
  } else return 'Please Select a Country';
  return null;
}
