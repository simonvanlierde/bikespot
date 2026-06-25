import { describe, expect, it } from 'vitest';

import { formatAccuracy, mapsLink } from '../src/features/location/display';

describe('coordinate display helpers', () => {
  it('builds a universal Google Maps search URL', () => {
    expect(mapsLink({ lat: 52.379189, lng: 4.899431 })).toBe(
      'https://www.google.com/maps/search/?api=1&query=52.379189,4.899431',
    );
  });

  it('formats accuracy when present and omits it otherwise', () => {
    expect(formatAccuracy({ lat: 0, lng: 0, accuracy: 12 })).toBe('±12m');
    expect(formatAccuracy({ lat: 0, lng: 0 })).toBe('');
  });
});
