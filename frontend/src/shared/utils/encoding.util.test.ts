import { describe, expect, it } from 'vitest';
import {
  decodeBlobAsText,
  detectEncodingFromBom,
  detectFileEncoding,
  encodeTextAsBlob,
  normalizeEncodingLabel,
  parseCharsetFromMimeType,
} from './encoding.util';

describe('encoding.util', () => {
  describe('normalizeEncodingLabel', () => {
    it('normalizes common aliases', () => {
      expect(normalizeEncodingLabel('UTF8')).toBe('utf-8');
      expect(normalizeEncodingLabel('UTF-8-SIG')).toBe('utf-8-bom');
      expect(normalizeEncodingLabel('latin1')).toBe('iso-8859-1');
      expect(normalizeEncodingLabel('UTF-16LE')).toBe('utf-16le');
    });
  });

  describe('parseCharsetFromMimeType', () => {
    it('extracts charset from content-type', () => {
      expect(parseCharsetFromMimeType('text/plain; charset=utf-8')).toBe('utf-8');
      expect(parseCharsetFromMimeType('text/html; charset="ISO-8859-1"')).toBe('iso-8859-1');
    });

    it('returns undefined when charset is missing', () => {
      expect(parseCharsetFromMimeType('application/octet-stream')).toBeUndefined();
    });
  });

  describe('detectEncodingFromBom', () => {
    it('detects UTF-8 BOM', () => {
      expect(detectEncodingFromBom(new Uint8Array([0xef, 0xbb, 0xbf, 0x61]))).toBe('utf-8-bom');
    });

    it('detects UTF-16 LE BOM', () => {
      expect(detectEncodingFromBom(new Uint8Array([0xff, 0xfe, 0x61, 0x00]))).toBe('utf-16le');
    });

    it('returns undefined when no BOM is present', () => {
      expect(detectEncodingFromBom(new Uint8Array([0x48, 0x69]))).toBeUndefined();
    });
  });

  describe('detectFileEncoding', () => {
    it('prefers charset from mime type', async () => {
      const blob = new Blob(['hello'], { type: 'text/plain' });
      await expect(detectFileEncoding(blob, 'text/plain; charset=iso-8859-1')).resolves.toBe(
        'iso-8859-1',
      );
    });

    it('falls back to BOM detection', async () => {
      const bytes = new Uint8Array([0xef, 0xbb, 0xbf, 0x68, 0x69]);
      const blob = new Blob([bytes], { type: 'text/plain' });
      await expect(detectFileEncoding(blob, 'text/plain')).resolves.toBe('utf-8-bom');
    });

    it('upgrades utf-8 mime charset when BOM is present', async () => {
      const bytes = new Uint8Array([0xef, 0xbb, 0xbf, 0x68, 0x69]);
      const blob = new Blob([bytes], { type: 'text/plain' });
      await expect(detectFileEncoding(blob, 'text/plain; charset=utf-8')).resolves.toBe('utf-8-bom');
    });

    it('defaults to utf-8', async () => {
      const blob = new Blob(['hello'], { type: 'text/plain' });
      await expect(detectFileEncoding(blob, 'text/plain')).resolves.toBe('utf-8');
    });
  });

  describe('decodeBlobAsText and encodeTextAsBlob', () => {
    it('round-trips utf-8 text', async () => {
      const original = 'Hello, 世界';
      const blob = encodeTextAsBlob(original, 'utf-8');
      await expect(decodeBlobAsText(blob, 'utf-8')).resolves.toBe(original);
    });

    it('round-trips utf-8-bom text', async () => {
      const original = 'Hello, 世界';
      const blob = encodeTextAsBlob(original, 'utf-8-bom');
      const bytes = new Uint8Array(await blob.arrayBuffer());

      expect(bytes[0]).toBe(0xef);
      expect(bytes[1]).toBe(0xbb);
      expect(bytes[2]).toBe(0xbf);
      await expect(decodeBlobAsText(blob, 'utf-8-bom')).resolves.toBe(original);
      await expect(detectFileEncoding(blob, blob.type)).resolves.toBe('utf-8-bom');
    });

    it('round-trips iso-8859-1 text', async () => {
      const original = 'café';
      const blob = encodeTextAsBlob(original, 'iso-8859-1');
      await expect(decodeBlobAsText(blob, 'iso-8859-1')).resolves.toBe(original);
    });
  });
});
