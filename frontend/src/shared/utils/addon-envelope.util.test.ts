import { describe, expect, it } from 'vitest';
import {
  type AddonEnvelopeMetadata,
  parseAddonEnvelope,
  parsedEnvelopeToBlob,
} from './addon-envelope.util';

const sampleMeta: AddonEnvelopeMetadata = {
  status: 'ok',
  filename: 'archive.zip',
  mimeType: 'application/zip',
  message: 'done',
};

function buildTestEnvelope(
  meta: AddonEnvelopeMetadata,
  fileBytes: Uint8Array,
): Uint8Array {
  const metaBytes = new TextEncoder().encode(JSON.stringify(meta));
  const envelope = new Uint8Array(4 + metaBytes.length + fileBytes.length);
  const view = new DataView(envelope.buffer);
  view.setUint32(0, metaBytes.length, false);
  envelope.set(metaBytes, 4);
  envelope.set(fileBytes, 4 + metaBytes.length);
  return envelope;
}

describe('addon-envelope.util', () => {
  describe('parseAddonEnvelope', () => {
    it('round-trips metadata and file bytes', () => {
      const fileBytes = new TextEncoder().encode('PK\x03\x04fake-zip-content');
      const envelope = buildTestEnvelope(sampleMeta, fileBytes);
      const parsed = parseAddonEnvelope(envelope);

      expect(parsed.meta).toEqual(sampleMeta);
      expect(parsed.fileBytes).toEqual(fileBytes);
    });

    it('throws when buffer is too short for length prefix', () => {
      expect(() => parseAddonEnvelope(new Uint8Array(2))).toThrow(
        'Envelope buffer too short for metadata length',
      );
    });

    it('throws when metadata is truncated', () => {
      const metaBytes = new TextEncoder().encode(JSON.stringify(sampleMeta));
      const header = new Uint8Array(4 + metaBytes.length);
      const view = new DataView(header.buffer);
      view.setUint32(0, metaBytes.length, false);
      header.set(metaBytes, 4);

      expect(() => parseAddonEnvelope(header.subarray(0, header.length - 1))).toThrow(
        'Envelope buffer truncated: metadata incomplete',
      );
    });
  });

  describe('parsedEnvelopeToBlob', () => {
    it('creates a blob with metadata mime type', () => {
      const fileBytes = new TextEncoder().encode('PK\x03\x04fake-zip-content');
      const parsed = parseAddonEnvelope(buildTestEnvelope(sampleMeta, fileBytes));
      const blob = parsedEnvelopeToBlob(parsed);

      expect(blob.type).toBe('application/zip');
      expect(blob.size).toBe(fileBytes.length);
    });
  });
});
