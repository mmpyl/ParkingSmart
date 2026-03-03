import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { fetchSheetData, saveSheetData } from '../features/cloud-sync/services/sheetService';

describe('sheet sync integration (mock fetch)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.stubGlobal('crypto', { randomUUID: () => 'test-uuid' });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('reads and saves using Apps Script contract', async () => {
    const fetchMock = vi.mocked(fetch);

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'success',
          data: [{ Placa: 'ABC123', Total: '2000' }],
          settings: { currency: 'COP' }
        })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'success' })
      } as Response);

    const read = await fetchSheetData('https://script.google.com/macros/s/abc/exec');
    expect(read?.data[0].id).toBe('test-uuid');
    expect(read?.data[0].Total).toBe(2000);

    const write = await saveSheetData('https://script.google.com/macros/s/abc/exec', {
      data: read?.data || [],
      settings: {
        tariffs: { Sedán: 2000 },
        printSettings: {
          businessName: 'X', nit: '1', address: 'A', phone: 'P', footerMessage: 'F', autoPrintEntry: false, paperWidth: '80mm',
          hardware: { type: 'system', name: 'Impresora', connected: true }
        },
        currency: 'COP'
      }
    });

    expect(write.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
