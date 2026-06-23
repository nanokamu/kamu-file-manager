import { afterEach, describe, expect, it, vi } from 'vitest';
import { computeSha256Hex } from './checksum.util';

const ABC_SHA256 = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';

function abcBlob(): Blob {
  return new Blob([new Uint8Array([0x61, 0x62, 0x63])]);
}

describe('checksum.util', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('computeSha256Hex', () => {
    it('hashes a known vector using Web Crypto when available', async () => {
      const blob = abcBlob();

      await expect(computeSha256Hex(blob)).resolves.toBe(ABC_SHA256);
    });

    it('hashes a known vector using JS fallback when crypto.subtle is unavailable', async () => {
      vi.stubGlobal('crypto', {});

      const blob = abcBlob();

      await expect(computeSha256Hex(blob)).resolves.toBe(ABC_SHA256);
    });
  });
});
