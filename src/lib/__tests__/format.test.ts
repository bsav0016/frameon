import { average, formatCount, formatPrice, parseSaleFields, timeAgo, validateAddress } from '../format';

describe('parseSaleFields', () => {
  it('treats blank fields as not for sale', () => {
    expect(parseSaleFields('', '')).toEqual({ priceCents: 0, quantity: 0 });
  });

  it('converts dollars to integer cents without float drift', () => {
    expect(parseSaleFields('12.50', '3')).toEqual({ priceCents: 1250, quantity: 3 });
    expect(parseSaleFields('19.99', '1')).toEqual({ priceCents: 1999, quantity: 1 });
    expect(parseSaleFields('1.15', '1')).toEqual({ priceCents: 115, quantity: 1 });
  });

  it.each([
    ['abc', '1', 'Price must be a number or left blank'],
    ['1.999', '1', 'Too many digits after the decimal point'],
    ['0.25', '1', 'The minimum price is $0.50'],
    ['10001', '1', 'The maximum price is $10,000'],
    ['5', '', 'Cannot have a price without a quantity'],
    ['', '5', 'Cannot have a quantity without a price'],
    ['5', '1.5', 'Quantity must be a positive whole number or left blank'],
    ['5', '0', 'Quantity must be a positive whole number or left blank'],
  ])('rejects price=%s quantity=%s', (price, quantity, message) => {
    expect(parseSaleFields(price, quantity)).toEqual({ error: expect.objectContaining({ message }) });
  });
});

describe('validateAddress', () => {
  const valid = { name: 'A B', line1: '1 Main St', city: 'Town', state: 'MN', postalCode: '55401', country: 'US' as const };

  it('accepts a valid US address', () => expect(validateAddress(valid)).toBeNull());
  it('requires a 5 digit US zip', () => expect(validateAddress({ ...valid, postalCode: '5540' })).toMatch('5 digits'));
  it('accepts Canadian postal codes with or without a space', () => {
    expect(validateAddress({ ...valid, country: 'CA', postalCode: 'K1A0B1' })).toBeNull();
    expect(validateAddress({ ...valid, country: 'CA', postalCode: 'K1A 0B1' })).toBeNull();
    expect(validateAddress({ ...valid, country: 'CA', postalCode: '123456' })).toMatch('Postal code');
  });
  it('requires a two letter state', () => expect(validateAddress({ ...valid, state: 'Minnesota' })).toMatch('2 letter'));
  it('requires a country', () => expect(validateAddress({ ...valid, country: '' })).toMatch('country'));
});

describe('helpers', () => {
  it('averages ratings', () => {
    expect(average([])).toBe(0);
    expect(average([5, 4, 3])).toBe(4);
  });

  it('formats counts and prices', () => {
    expect(formatCount(1, 'Rating')).toBe('1 Rating');
    expect(formatCount(2, 'Rating')).toBe('2 Ratings');
    expect(formatCount(1500, 'Rating')).toBe('1.5k Ratings');
    expect(formatPrice(1999)).toBe('$19.99');
  });

  it('describes elapsed time', () => {
    const now = new Date('2026-11-10T12:00:00Z');
    expect(timeAgo(new Date('2026-11-10T11:59:50Z'), now)).toBe('just now');
    expect(timeAgo(new Date('2026-11-10T11:30:00Z'), now)).toBe('30m');
    expect(timeAgo(new Date('2026-11-10T09:00:00Z'), now)).toBe('3h');
    expect(timeAgo(new Date('2026-11-08T12:00:00Z'), now)).toBe('2d');
  });
});
