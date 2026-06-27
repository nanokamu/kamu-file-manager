import { Readable } from 'node:stream';
import { ReturnStatus, ReturnTemplateWithFile } from '../config/addon.types';
import {
  buildEnvelopeHeader,
  createEnvelopeStream,
  getEnvelopeContentLength,
  parseAddonEnvelope,
  parseEnvelope,
  serializeEnvelopeMetadata,
} from './addon-envelope.util';

const sampleMeta: ReturnTemplateWithFile = {
  status: ReturnStatus.Ok,
  filename: 'archive.zip',
  mimeType: 'application/octet-stream',
  message: 'done',
};

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(
      Buffer.isBuffer(chunk)
        ? chunk
        : Buffer.from(chunk as string | Uint8Array),
    );
  }
  return Buffer.concat(chunks);
}

describe('addon-envelope.util', () => {
  describe('serializeEnvelopeMetadata', () => {
    it('serializes metadata as UTF-8 JSON', () => {
      const buffer = serializeEnvelopeMetadata(sampleMeta);
      expect(JSON.parse(buffer.toString('utf8'))).toEqual(sampleMeta);
    });
  });

  describe('buildEnvelopeHeader', () => {
    it('prefixes metadata with uint32 BE length', () => {
      const metaBuffer = serializeEnvelopeMetadata(sampleMeta);
      const header = buildEnvelopeHeader(sampleMeta);

      expect(header.readUInt32BE(0)).toBe(metaBuffer.length);
      expect(header.subarray(4).toString('utf8')).toBe(
        metaBuffer.toString('utf8'),
      );
    });
  });

  describe('getEnvelopeContentLength', () => {
    it('computes 4 + metaLen + fileSize', () => {
      const metaLen = serializeEnvelopeMetadata(sampleMeta).length;
      const fileSize = 1024;
      expect(getEnvelopeContentLength(metaLen, fileSize)).toBe(
        4 + metaLen + fileSize,
      );
    });
  });

  describe('createEnvelopeStream + parseEnvelope', () => {
    it('round-trips metadata and file bytes', async () => {
      const fileBytes = Buffer.from('PK\x03\x04fake-zip-content');
      const fileStream = Readable.from([fileBytes]);
      const envelopeStream = createEnvelopeStream(sampleMeta, fileStream);
      const envelope = await streamToBuffer(envelopeStream);
      const parsed = parseEnvelope(envelope);

      expect(parsed.meta).toEqual(sampleMeta);
      expect(parsed.fileBytes).toEqual(fileBytes);
    });

    it('content length matches envelope size', async () => {
      const fileBytes = Buffer.alloc(512, 0xab);
      const metaLen = serializeEnvelopeMetadata(sampleMeta).length;
      const expectedLength = getEnvelopeContentLength(
        metaLen,
        fileBytes.length,
      );
      const envelope = await streamToBuffer(
        createEnvelopeStream(sampleMeta, Readable.from([fileBytes])),
      );

      expect(envelope.length).toBe(expectedLength);
    });
  });

  describe('parseEnvelope', () => {
    it('throws when buffer is too short for length prefix', () => {
      expect(() => parseEnvelope(Buffer.alloc(2))).toThrow(
        'Envelope buffer too short for metadata length',
      );
    });

    it('throws when metadata is truncated', () => {
      const header = buildEnvelopeHeader(sampleMeta);
      expect(() =>
        parseEnvelope(header.subarray(0, header.length - 1)),
      ).toThrow('Envelope buffer truncated: metadata incomplete');
    });
  });

  describe('parseAddonEnvelope', () => {
    it('round-trips metadata and file bytes', async () => {
      const fileBytes = Buffer.from('PK\x03\x04fake-zip-content');
      const envelope = await streamToBuffer(
        createEnvelopeStream(sampleMeta, Readable.from([fileBytes])),
      );
      const parsed = parseAddonEnvelope(envelope);

      expect(parsed.meta).toEqual(sampleMeta);
      expect(Buffer.from(parsed.fileBytes)).toEqual(fileBytes);
    });

    it('throws when buffer is too short for length prefix', () => {
      expect(() => parseAddonEnvelope(new Uint8Array(2))).toThrow(
        'Envelope buffer too short for metadata length',
      );
    });

    it('throws when metadata is truncated', () => {
      const header = buildEnvelopeHeader(sampleMeta);
      expect(() =>
        parseAddonEnvelope(header.subarray(0, header.length - 1)),
      ).toThrow('Envelope buffer truncated: metadata incomplete');
    });
  });
});
