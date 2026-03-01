import { describe, expect, it } from 'vitest';
import { MAJOR_CITIES, pickRandomCity } from '../shared/randomCities';

describe('random city catalog', () => {
  it('contains at least 70 city options', () => {
    expect(MAJOR_CITIES.length).toBeGreaterThanOrEqual(70);
  });

  it('stores valid coordinate ranges', () => {
    for (const city of MAJOR_CITIES) {
      expect(city.point.lat).toBeGreaterThanOrEqual(-90);
      expect(city.point.lat).toBeLessThanOrEqual(90);
      expect(city.point.lon).toBeGreaterThanOrEqual(-180);
      expect(city.point.lon).toBeLessThanOrEqual(180);
    }
  });

  it('picks deterministically from provided random value', () => {
    const first = pickRandomCity(0);
    const last = pickRandomCity(0.999999);
    expect(first.name).toBe(MAJOR_CITIES[0]?.name);
    expect(last.name).toBe(MAJOR_CITIES[MAJOR_CITIES.length - 1]?.name);
  });
});
