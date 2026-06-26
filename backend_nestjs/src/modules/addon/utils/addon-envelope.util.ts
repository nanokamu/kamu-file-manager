// Keep parseAddonEnvelope in sync with frontend/src/shared/utils/addon-envelope.util.ts

import { Readable } from 'node:stream';
import type { ReturnTemplateWithFile } from '../config/addon.types';

export interface AddonEnvelopeMetadata {
  status: 'ok';
  filename: string;
  mimeType: string;
  message?: string;
}

export interface ParsedAddonEnvelope {
  meta: AddonEnvelopeMetadata;
  fileBytes: Uint8Array;
}

export function toUint8Array(input: Uint8Array | ArrayBuffer): Uint8Array {
  return input instanceof Uint8Array ? input : new Uint8Array(input);
}

export function parseAddonEnvelope(
  input: Uint8Array | ArrayBuffer,
): ParsedAddonEnvelope {
  const bytes = toUint8Array(input);

  if (bytes.length < 4) {
    throw new Error('Envelope buffer too short for metadata length');
  }

  const metaLen = new DataView(
    bytes.buffer,
    bytes.byteOffset,
    bytes.byteLength,
  ).getUint32(0, false);
  const headerEnd = 4 + metaLen;

  if (bytes.length < headerEnd) {
    throw new Error('Envelope buffer truncated: metadata incomplete');
  }

  const meta = JSON.parse(
    new TextDecoder().decode(bytes.subarray(4, headerEnd)),
  ) as AddonEnvelopeMetadata;

  return {
    meta,
    fileBytes: bytes.subarray(headerEnd),
  };
}

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
  const parsed = parseAddonEnvelope(buffer);

  return {
    meta: parsed.meta,
    fileBytes: Buffer.from(parsed.fileBytes),
  };
}
