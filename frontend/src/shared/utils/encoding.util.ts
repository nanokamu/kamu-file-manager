const UTF8_BOM = new Uint8Array([0xef, 0xbb, 0xbf]);

const ENCODING_ALIASES: Record<string, string> = {
  utf8: 'utf-8',
  'utf-8': 'utf-8',
  'utf-8-bom': 'utf-8-bom',
  'utf-8-sig': 'utf-8-bom',
  utf8bom: 'utf-8-bom',
  latin1: 'iso-8859-1',
  'iso-8859-1': 'iso-8859-1',
  'utf-16': 'utf-16le',
  'utf-16le': 'utf-16le',
  'utf-16-le': 'utf-16le',
  'utf-16be': 'utf-16be',
  'utf-16-be': 'utf-16be',
};

export function normalizeEncodingLabel(label: string): string {
  const normalized = label.trim().toLowerCase().replace(/_/g, '-');
  return ENCODING_ALIASES[normalized] ?? normalized;
}

export function parseCharsetFromMimeType(mimeType: string): string | undefined {
  const match = mimeType.match(/;\s*charset=([^;\s]+)/i);
  if (!match?.[1]) {
    return undefined;
  }

  return normalizeEncodingLabel(match[1].replace(/^["']|["']$/g, ''));
}

function decoderEncodingLabel(label: string): string {
  return label === 'utf-8-bom' ? 'utf-8' : label;
}

export function detectEncodingFromBom(bytes: Uint8Array): string | undefined {
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return 'utf-8-bom';
  }

  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return 'utf-16le';
  }

  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return 'utf-16be';
  }

  return undefined;
}

export async function detectFileEncoding(blob: Blob, mimeType?: string): Promise<string> {
  const prefix = await blob.slice(0, 4).arrayBuffer();
  const bomEncoding = detectEncodingFromBom(new Uint8Array(prefix));

  if (mimeType) {
    const charset = parseCharsetFromMimeType(mimeType);
    if (charset) {
      if (charset === 'utf-8' && bomEncoding === 'utf-8-bom') {
        return 'utf-8-bom';
      }

      return charset;
    }
  }

  if (bomEncoding) {
    return bomEncoding;
  }

  return 'utf-8';
}

export async function decodeBlobAsText(blob: Blob, encoding: string): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const label = normalizeEncodingLabel(encoding);
  return new TextDecoder(decoderEncodingLabel(label)).decode(buffer);
}

function encodeUtf8Bom(text: string): Uint8Array {
  const encoded = new TextEncoder().encode(text);
  const bytes = new Uint8Array(UTF8_BOM.length + encoded.length);
  bytes.set(UTF8_BOM, 0);
  bytes.set(encoded, UTF8_BOM.length);
  return bytes;
}

function encodeLatin1(text: string): Uint8Array {
  const bytes = new Uint8Array(text.length);

  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    bytes[index] = code > 255 ? 0x3f : code;
  }

  return bytes;
}

function encodeUtf16Le(text: string, includeBom: boolean): Uint8Array {
  const bomLength = includeBom ? 2 : 0;
  const bytes = new Uint8Array(bomLength + text.length * 2);

  if (includeBom) {
    bytes[0] = 0xff;
    bytes[1] = 0xfe;
  }

  const view = new DataView(bytes.buffer);
  for (let index = 0; index < text.length; index += 1) {
    view.setUint16(bomLength + index * 2, text.charCodeAt(index), true);
  }

  return bytes;
}

function encodeUtf16Be(text: string, includeBom: boolean): Uint8Array {
  const bomLength = includeBom ? 2 : 0;
  const bytes = new Uint8Array(bomLength + text.length * 2);

  if (includeBom) {
    bytes[0] = 0xfe;
    bytes[1] = 0xff;
  }

  const view = new DataView(bytes.buffer);
  for (let index = 0; index < text.length; index += 1) {
    view.setUint16(bomLength + index * 2, text.charCodeAt(index), false);
  }

  return bytes;
}

export function encodeTextAsBlob(text: string, encoding: string): Blob {
  const label = normalizeEncodingLabel(encoding);
  let bytes: Uint8Array;
  // let bytes: Uint8Array<ArrayBuffer>;

  switch (label) {
    case 'utf-16le':
      bytes = encodeUtf16Le(text, true);
      break;
    case 'utf-16be':
      bytes = encodeUtf16Be(text, true);
      break;
    case 'iso-8859-1':
      bytes = encodeLatin1(text);
      break;
    case 'utf-8-bom':
      bytes = encodeUtf8Bom(text);
      break;
    case 'utf-8':
    default:
      bytes = new TextEncoder().encode(text);
      break;
  }

  const mimeCharset = label === 'utf-8-bom' ? 'utf-8' : label;
  return new Blob([bytes as Uint8Array<ArrayBuffer>], { type: `text/plain;charset=${mimeCharset}` });
}
