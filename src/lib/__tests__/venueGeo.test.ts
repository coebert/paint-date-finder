import { describe, it, expect } from 'vitest';
import { resolveVenueCoords } from '@/lib/venueGeo';
describe('resolve', () => {
  it('matches variants', () => {
    for (const n of ['Combat Paintball Limited','NPF Bassetts Pole Adventure Park','Outpost Paintball and Airsoft','Mayhem Paintball Office','Bristol Activity Centre','Go Ballistic Bristol','Paintball HQ','BZ Paintball','Splatoon Paintball & Airsoft']) {
      expect(resolveVenueCoords(n), n).not.toBeNull();
    }
    expect(resolveVenueCoords('Totally Unknown Venue Xyz')).toBeNull();
  });
  it('prefers db coords', () => {
    expect(resolveVenueCoords('Mayhem Paintball', [{ name: 'Mayhem Paintball', latitude: 1, longitude: 2 }])).toMatchObject({ lat: 1, source: 'database' });
  });
});
