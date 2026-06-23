import { ZipArchive } from 'archiver';
import { Readable } from 'stream';

export interface ZipEntry {
  locator: string;
  zipEntryName: string;
}

export class ZipBuilder {
  public readonly STATE_OPEN: string = 'OPEN';
  public readonly STATE_CLOSED: string = 'CLOSED';
  private readonly _archive: ZipArchive;
  public state: string;

  constructor() {
    this._archive = new ZipArchive({ zlib: { level: 0 } });
    this._archive.on('error', (error) => {
      this._archive.destroy(error);
    });
    this.state = this.STATE_OPEN;
  }

  addFile(buffer: Buffer, name: string) {
    if (this.state !== this.STATE_OPEN) {
      throw new Error('Archive is not in OPEN state');
    }

    this._archive.append(buffer, { name });
  }

  close() {
    if (this.state !== this.STATE_OPEN) {
      throw new Error('Archive is not in OPEN state');
    }
    this.state = this.STATE_CLOSED;
    void this._archive.finalize();
  }

  get archive(): Readable {
    if (this.state !== this.STATE_CLOSED) {
      throw new Error('Archive is not in CLOSED state');
    }
    return this._archive;
  }
}
