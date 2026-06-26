export function mimeTypeForArchive(archiveType: string): string {
  if (archiveType === 'zip') {
    return 'application/zip';
  }

  throw new Error(`Unsupported archive type: ${archiveType}`);
}
