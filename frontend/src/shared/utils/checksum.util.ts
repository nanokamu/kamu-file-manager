import { sha256 } from '@noble/hashes/sha2.js';

function digestToHex(digest: Uint8Array): string {
  return Array.from(digest)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function computeSha256Hex(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  if (globalThis.crypto?.subtle) {
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    return digestToHex(new Uint8Array(digest));
  }

  return digestToHex(sha256(bytes));
}
