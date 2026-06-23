import { BadRequestException } from '@nestjs/common';
import { createHash } from 'crypto';
import { createReadStream } from 'fs';
import { readFile } from 'fs/promises';
import { Transform } from 'stream';
import type { Checksum } from '../../modules/files/interfaces/storage-adapter.interface';

const CRC32C_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let crc = i;
    for (let j = 0; j < 8; j += 1) {
      crc = crc & 1 ? 0x82f63b78 ^ (crc >>> 1) : crc >>> 1;
    }
    table[i] = crc >>> 0;
  }
  return table;
})();

function updateCrc32c(crc: number, buffer: Buffer): number {
  let next = crc ^ 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    next = CRC32C_TABLE[(next ^ buffer[i]) & 0xff] ^ (next >>> 8);
  }
  return (next ^ 0xffffffff) >>> 0;
}

function digestToHex(buffer: Buffer): string {
  return buffer.toString('hex');
}

function digestToBase64(buffer: Buffer): string {
  return buffer.toString('base64');
}

function normalizeExpectedValue(checksum: Checksum): string {
  const value = checksum.value.trim();
  const isHex = /^[0-9a-fA-F]+$/.test(value);

  if (checksum.algorithm === 'crc32c') {
    if (isHex) {
      return (parseInt(value, 16) >>> 0).toString();
    }
    return (parseInt(value, 10) >>> 0).toString();
  }

  return isHex ? value.toLowerCase() : value;
}

function formatComputedValue(
  algorithm: Checksum['algorithm'],
  buffer: Buffer,
): string {
  if (algorithm === 'crc32c') {
    const crc = updateCrc32c(0, buffer);
    return crc.toString(16).padStart(8, '0');
  }

  const hash = createHash(algorithm).update(buffer).digest();
  return digestToHex(hash);
}

export function computeBufferChecksum(
  buffer: Buffer,
  algorithm: Checksum['algorithm'] = 'sha256',
): Checksum {
  return {
    algorithm,
    value: formatComputedValue(algorithm, buffer),
  };
}

export async function computeFileChecksum(
  filePath: string,
  algorithm: Checksum['algorithm'] = 'sha256',
): Promise<Checksum> {
  const buffer = await readFile(filePath);
  return computeBufferChecksum(buffer, algorithm);
}

export function createChecksumVerifier(expected: Checksum): Transform {
  const chunks: Buffer[] = [];

  return new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      chunks.push(chunk);
      callback(null, chunk);
    },
    flush(callback) {
      const buffer = Buffer.concat(chunks);
      const actual = formatComputedValue(expected.algorithm, buffer);
      const normalizedExpected = normalizeExpectedValue(expected);

      if (actual !== normalizedExpected && actual !== expected.value.trim()) {
        callback(
          new BadRequestException(
            `Checksum mismatch: expected ${expected.algorithm} ${expected.value}, got ${actual}`,
          ),
        );
        return;
      }

      callback();
    },
  });
}

export async function computeStreamChecksum(
  filePath: string,
  algorithm: Checksum['algorithm'] = 'sha256',
): Promise<Checksum> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    createReadStream(filePath)
      .on('data', (chunk: Buffer) => chunks.push(chunk))
      .on('error', reject)
      .on('end', () => {
        resolve({
          algorithm,
          value: formatComputedValue(algorithm, Buffer.concat(chunks)),
        });
      });
  });
}

export { digestToBase64, digestToHex };
