import { Readable } from 'node:stream';
import type { ReturnTemplateWithFile } from '../config/addon.types';

export function serializeEnvelopeMetadata(meta: ReturnTemplateWithFile): Buffer {
  return Buffer.from(JSON.stringify(meta), 'utf8');
}

export function buildEnvelopeHeader(meta: ReturnTemplateWithFile): Buffer {
  const metaBuffer = serializeEnvelopeMetadata(meta);
  const header = Buffer.allocUnsafe(4 + metaBuffer.length);
  header.writeUInt32BE(metaBuffer.length, 0);
  metaBuffer.copy(header, 4);
  return header;
}

export function getEnvelopeContentLength(
  metaLen: number,
  fileSize: number,
): number {
  return 4 + metaLen + fileSize;
}

export function createEnvelopeStream(
  meta: ReturnTemplateWithFile,
  fileStream: Readable,
): Readable {
  const header = buildEnvelopeHeader(meta);
  return Readable.from(
    (async function* () {
      yield header;
      for await (const chunk of fileStream) {
        yield chunk;
      }
    })(),
  );
}

export interface ParsedEnvelope {
  meta: ReturnTemplateWithFile;
  fileBytes: Buffer;
}

export function parseEnvelope(buffer: Buffer): ParsedEnvelope {
  if (buffer.length < 4) {
    throw new Error('Envelope buffer too short for metadata length');
  }

  const metaLen = buffer.readUInt32BE(0);
  const headerEnd = 4 + metaLen;

  if (buffer.length < headerEnd) {
    throw new Error('Envelope buffer truncated: metadata incomplete');
  }

  const meta = JSON.parse(
    buffer.subarray(4, headerEnd).toString('utf8'),
  ) as ReturnTemplateWithFile;

  return {
    meta,
    fileBytes: buffer.subarray(headerEnd),
  };
}
