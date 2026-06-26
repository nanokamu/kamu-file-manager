// Keep parseAddonEnvelope in sync with backend_nestjs/src/modules/addon/utils/addon-envelope.util.ts

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

export async function parseAddonEnvelopeResponse(
  response: Response,
): Promise<ParsedAddonEnvelope> {
  return parseAddonEnvelope(await response.arrayBuffer());
}

export function parsedEnvelopeToBlob(parsed: ParsedAddonEnvelope): Blob {
  return new Blob([parsed.fileBytes], { type: parsed.meta.mimeType });
}
