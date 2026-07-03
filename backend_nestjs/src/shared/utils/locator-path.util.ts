import { BadRequestException } from '@nestjs/common';
import { basename, dirname, extname } from 'path';

export function parentLocator(locator: string): string {
  const normalized = locator.replace(/^\/+/, '').replace(/\\/g, '/');
  const parent = dirname(normalized);
  return parent === '.' ? '' : parent;
}

function formatDatetimeStamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `-${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`
  );
}

function withDatetimeSuffix(archiveName: string, date: Date): string {
  const ext = extname(archiveName);
  const base = ext ? basename(archiveName, ext) : archiveName;
  return `${base}_${formatDatetimeStamp(date)}${ext}`;
}

export async function resolveUniqueArchiveName(
  checkExists: (name: string) => Promise<boolean>,
  archiveName: string,
): Promise<string> {
  if (!(await checkExists(archiveName))) {
    return archiveName;
  }

  const stamped = withDatetimeSuffix(archiveName, new Date());
  if (!(await checkExists(stamped))) {
    return stamped;
  }

  for (let i = 0; i < 1000; i++) {
    const ext = extname(archiveName);
    const base = ext ? basename(archiveName, ext) : archiveName;
    const candidate = `${base}_${formatDatetimeStamp(new Date())}-${i}${ext}`;
    if (!(await checkExists(candidate))) {
      return candidate;
    }
  }

  throw new BadRequestException('Unable to resolve a unique archive name');
}

export function joinLocator(parent: string, fileName: string): string {
  return parent ? `${parent}/${fileName}` : fileName;
}

export function formatParentForMessage(parent: string): string {
  return parent || 'root';
}
