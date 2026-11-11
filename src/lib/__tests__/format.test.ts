import { average, formatCount, parseDate, parseSaleFields, validateAddress } from '../format';

describe('parseDate', () => {
  it('parses ISO strings', () => {
    expect(parseDate('2026-11-10T15:45:00.000Z').toISOString()).toBe('2026-11-10T15:45:00.000Z');
  });

  it('parses the legacy Swift format', () => {
    const d = parseDate('Nov 10, 2021 at 3:45 PM');
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()]).toEqual([2021, 10, 10, 15, 45]);
  });

  it('handles 12 AM and 12 PM', () => {
    expect(parseDate('Jan 2, 2020 at 12:05 AM').getHours()).toBe(0);
    expect(parseDate('Jan 2, 2020 at 12:05 PM').getHours()).toBe(12);
  });
});

describe('parseSaleFields', () => {
  it('treats blank fields as not for sale', () => {
    expect(parseSaleFields('', '')).toEqual({ price: 0, quantity: 0 });
  });

  it('accepts a valid price and quantity', () => {
    expect(parseSaleFields('12.50', '3')).toEqual({ price: 12.5, quantity: 3 });
  });

  it.each([
    ['abc', '1', 'Price must be a number or left blank'],
    ['1.999', '1', 'Too many digits after the decimal point'],
    ['5', '', 'Cannot have a price without a quantity'],
    ['', '5', 'Cannot have a quantity without a price'],
    ['5', '1.5', 'Quantity must be a positive integer or left blank'],
  ])('rejects price=%s quantity=%s', (price, quantity, message) => {
    expect(parseSaleFields(price, quantity)).toEqual({ error: expect.objectContaining({ message }) });
  });
});

describe('validateAddress', () => {
  const valid = { name: 'A B', line1: '1 Main St', city: 'Town', state: 'MN', postalCode: '55401', country: 'US' };

  it('accepts a valid US address', () => expect(validateAddress(valid)).toBeNull());
  it('requires a 5 digit US zip', () => expect(validateAddress({ ...valid, postalCode: '5540' })).toMatch('5 Digits'));
  it('requires a 6 character Canadian postal code', () =>
    expect(validateAddress({ ...valid, country: 'CAN', postalCode: 'K1A0B1' })).toBeNull());
  it('requires a two letter state', () => expect(validateAddress({ ...valid, state: 'Minnesota' })).toMatch('2 Letter'));
  it('requires a country', () => expect(validateAddress({ ...valid, country: '' })).toMatch('Country'));
});

describe('helpers', () => {
  it('averages ratings', () => {
    expect(average([])).toBe(0);
    expect(average([5, 4, 3])).toBe(4);
  });

  it('formats counts', () => {
    expect(formatCount(1, 'Rating')).toBe('1 Rating');
    expect(formatCount(2, 'Rating')).toBe('2 Ratings');
    expect(formatCount(1500, 'Rating')).toBe('1.5k Ratings');
  });
});
