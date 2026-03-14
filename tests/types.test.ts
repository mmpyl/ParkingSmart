import { describe, expect, it } from 'vitest';
import { calculateParkingStats, formatCurrency, DEFAULT_TARIFA } from '../types';

describe('types utilities', () => {
  it('calculateParkingStats should charge at least one hour', () => {
    const entry = new Date('2025-01-01T10:00:00Z').toISOString();
    const exit = new Date('2025-01-01T10:10:00Z');
    const stats = calculateParkingStats(entry, 'Sedán', DEFAULT_TARIFA, exit, 'hour');

    expect(stats.chargedUnits).toBe(1);
    expect(stats.total).toBe(DEFAULT_TARIFA['Sedán']);
    expect(stats.unitLabel).toBe('hora');
  });

  it('calculateParkingStats should round up partial hours', () => {
    const entry = new Date('2025-01-01T10:00:00Z').toISOString();
    const exit = new Date('2025-01-01T12:20:00Z');
    const stats = calculateParkingStats(entry, 'Moto', DEFAULT_TARIFA, exit, 'hour');

    expect(stats.chargedUnits).toBe(3);
    expect(stats.total).toBe(DEFAULT_TARIFA['Moto'] * 3);
  });

  it('calculateParkingStats should charge by days when billingUnit is day', () => {
    const entry = new Date('2025-01-01T10:00:00Z').toISOString();
    const exit = new Date('2025-01-03T09:00:00Z');
    const stats = calculateParkingStats(entry, 'SUV', DEFAULT_TARIFA, exit, 'day');

    expect(stats.chargedUnits).toBe(2);
    expect(stats.total).toBe(DEFAULT_TARIFA['SUV'] * 2);
    expect(stats.unitLabel).toBe('día');
  });

  it('formatCurrency should fallback for invalid currency', () => {
    const value = formatCurrency(1000, 'INVALID');
    expect(value).toContain('INVALID');
  });
});
