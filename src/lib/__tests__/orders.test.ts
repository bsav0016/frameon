import { orderAction, trackingProblem, trackingUrl } from '../orders';

describe('trackingUrl', () => {
  it('links the big carriers and strips spaces from the number', () => {
    expect(trackingUrl('USPS', '9400 1118 9922')).toBe('https://tools.usps.com/go/TrackConfirmAction?tLabels=940011189922');
    expect(trackingUrl('UPS', '1Z999AA10123456784')).toBe('https://www.ups.com/track?tracknum=1Z999AA10123456784');
    expect(trackingUrl('FedEx', '123456789012')).toContain('fedex.com');
    expect(trackingUrl('DHL', '1234567890')).toContain('dhl.com');
  });

  it('has no link for other carriers or missing data', () => {
    expect(trackingUrl('Other', '1234')).toBeNull();
    expect(trackingUrl(null, '1234')).toBeNull();
    expect(trackingUrl('USPS', null)).toBeNull();
  });

  it('cannot be used to break out of the link', () => {
    expect(trackingUrl('UPS', 'a&b=c#x')).toBe('https://www.ups.com/track?tracknum=a%26b%3Dc%23x');
  });
});

describe('trackingProblem', () => {
  it('accepts normal numbers and rejects junk', () => {
    expect(trackingProblem(' 9400 1118 9922 3197 ')).toBeNull();
    for (const bad of ['', 'abc', 'x'.repeat(41), '12 34; DROP', '<b>1234</b>']) expect(trackingProblem(bad)).not.toBeNull();
  });
});

describe('orderAction', () => {
  it('lets the seller ship a paid order and the buyer confirm a shipped one', () => {
    expect(orderAction({ status: 'paid' }, 'seller')).toBe('ship');
    expect(orderAction({ status: 'shipped' }, 'buyer')).toBe('confirmDelivery');
  });

  it('offers nothing otherwise', () => {
    expect(orderAction({ status: 'paid' }, 'buyer')).toBeNull();
    expect(orderAction({ status: 'shipped' }, 'seller')).toBeNull();
    for (const status of ['delivered', 'refunded', 'disputed'] as const) {
      expect(orderAction({ status }, 'seller')).toBeNull();
      expect(orderAction({ status }, 'buyer')).toBeNull();
    }
  });
});
