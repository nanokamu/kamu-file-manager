import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Readable } from 'node:stream';
import { ADDON_MAX_ENVELOPE_BYTES } from '../config/addon.constants';
import { ReturnStatus } from '../config/addon.types';
import { FilesService } from '../../files/services/files.service';
import { AddonService } from './addon.service';
import {
  buildEnvelopeHeader,
  createEnvelopeStream,
  getEnvelopeContentLength,
  parseEnvelope,
} from '../utils/addon-envelope.util';

describe('AddonService', () => {
  let addonService: AddonService;
  let filesService: {
    downloadZip: jest.Mock;
    compressLocatorsToZipFile: jest.Mock;
  };

  beforeEach(async () => {
    filesService = {
      downloadZip: jest.fn(),
      compressLocatorsToZipFile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AddonService,
        { provide: FilesService, useValue: filesService },
      ],
    }).compile();

    addonService = module.get(AddonService);
  });

  async function readStream(stream: Readable): Promise<Buffer> {
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

  describe('addonDownloadAsZip', () => {
    it('returns envelope with correct content length', async () => {
      const fileBytes = Buffer.from('PK\x03\x04zip');
      filesService.downloadZip.mockResolvedValue({
        stream: Readable.from([fileBytes]),
        archiveName: 'archive.zip',
        checksum: null,
        size: fileBytes.length,
      });

      const { stream, contentLength } = await addonService.addonDownloadAsZip({
        locators: ['a.txt'],
        archiveName: 'archive.zip',
        archiveType: 'zip',
      });

      const envelope = await readStream(stream);
      const metaLen =
        buildEnvelopeHeader({
          status: ReturnStatus.Ok,
          filename: 'archive.zip',
          mimeType: 'application/zip',
          message: 'addonDownloadAsZip completed',
        }).length - 4;

      expect(contentLength).toBe(
        getEnvelopeContentLength(metaLen, fileBytes.length),
      );
      expect(envelope.length).toBe(contentLength);

      const parsed = parseEnvelope(envelope);
      expect(parsed.meta.status).toBe(ReturnStatus.Ok);
      expect(parsed.meta.filename).toBe('archive.zip');
      expect(parsed.fileBytes).toEqual(fileBytes);
    });

    it('rejects non-zip archive types', async () => {
      await expect(
        addonService.addonDownloadAsZip({
          locators: ['a.txt'],
          archiveName: 'bundle.tar',
          archiveType: 'tar',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects archives exceeding addon size limit', async () => {
      filesService.downloadZip.mockResolvedValue({
        stream: Readable.from([Buffer.alloc(0)]),
        archiveName: 'huge.zip',
        checksum: null,
        size: ADDON_MAX_ENVELOPE_BYTES + 1,
      });

      await expect(
        addonService.addonDownloadAsZip({
          locators: ['big.bin'],
          archiveName: 'huge.zip',
          archiveType: 'zip',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('addonCompressAsZip', () => {
    it('saves zip locally and returns a JSON message', async () => {
      filesService.compressLocatorsToZipFile.mockResolvedValue({
        savedLocator: 'compressed.zip',
        savedName: 'compressed.zip',
      });

      const result = await addonService.addonCompressAsZip({
        locators: ['a.txt'],
        archiveName: 'compressed.zip',
      });

      expect(filesService.compressLocatorsToZipFile).toHaveBeenCalledWith(
        '',
        ['a.txt'],
        'compressed.zip',
      );
      expect(result).toEqual({
        status: ReturnStatus.Ok,
        message: 'Created compressed.zip in root',
      });
    });

    it('rejects locators from different directories', async () => {
      await expect(
        addonService.addonCompressAsZip({
          locators: ['a.txt', 'folder/b.txt'],
          archiveName: 'compressed.zip',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(filesService.compressLocatorsToZipFile).not.toHaveBeenCalled();
    });
  });
});
