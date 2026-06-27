import { StreamableFile } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { Response } from 'express';
import { Readable } from 'node:stream';
import { addonConfig } from '../config/addon.config';
import { ADDON_ENVELOPE_CONTENT_TYPE } from '../config/addon.constants';
import { ReturnStatus, ReturnTemplateWithFile } from '../config/addon.types';
import { AddonService } from '../services/addon.service';
import {
  createEnvelopeStream,
  getEnvelopeContentLength,
  parseEnvelope,
  serializeEnvelopeMetadata,
} from '../utils/addon-envelope.util';
import { AddonController } from './addon.controller';

async function readStreamableFile(file: StreamableFile): Promise<Buffer> {
  const stream = file.getStream();
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

describe('AddonController', () => {
  let addonController: AddonController;
  let addonService: {
    addonDownloadAsZip: jest.Mock;
    addonCompressAsZip: jest.Mock;
  };

  const fileBytes = Buffer.from('PK\x03\x04zip-content');
  const metadata: ReturnTemplateWithFile = {
    status: ReturnStatus.Ok,
    filename: 'archive.zip',
    mimeType: 'application/octet-stream',
    message: 'done',
  };
  const metaLen = serializeEnvelopeMetadata(metadata).length;
  const contentLength = getEnvelopeContentLength(metaLen, fileBytes.length);
  const envelopeStream = createEnvelopeStream(
    metadata,
    Readable.from([fileBytes]),
  );

  beforeEach(async () => {
    addonService = {
      addonDownloadAsZip: jest.fn().mockResolvedValue({
        stream: envelopeStream,
        contentLength,
      }),
      addonCompressAsZip: jest.fn().mockResolvedValue({
        status: ReturnStatus.Ok,
        message: 'Created archive.zip in root',
      }),
    };

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AddonController],
      providers: [{ provide: AddonService, useValue: addonService }],
    }).compile();

    addonController = app.get<AddonController>(AddonController);
  });

  function mockResponse(): { res: Response; set: jest.Mock } {
    const headers: Record<string, string> = {};
    const set = jest.fn((values: Record<string, string>) => {
      Object.assign(headers, values);
    });

    return {
      set,
      res: {
        set,
        getHeader: (name: string) => headers[name.toLowerCase()],
      } as unknown as Response,
    };
  }

  describe('getConfig', () => {
    it('should return addon config template', () => {
      expect(addonController.getConfig()).toEqual(addonConfig);
    });
  });

  describe('addonDownloadAsZip', () => {
    it('returns StreamableFile envelope with headers', async () => {
      const { res, set } = mockResponse();
      const dto = {
        locators: ['a.txt'],
        archiveName: 'archive.zip',
        archiveType: 'zip',
        currentFolderLocator: 'projects',
      };

      const file = await addonController.addonDownloadAsZip(dto, res);

      expect(addonService.addonDownloadAsZip).toHaveBeenCalledWith(dto);
      expect(file).toBeInstanceOf(StreamableFile);
      expect(set).toHaveBeenCalledWith({
        'Content-Type': ADDON_ENVELOPE_CONTENT_TYPE,
        'Content-Length': String(contentLength),
      });

      const envelope = await readStreamableFile(file);
      const parsed = parseEnvelope(envelope);
      expect(parsed.fileBytes).toEqual(fileBytes);
    });
  });

  describe('addonCompressAsZip', () => {
    it('returns JSON success message', async () => {
      const dto = {
        locators: ['a.txt'],
        archiveName: 'archive.zip',
        currentFolderLocator: '',
      };

      const result = await addonController.addonCompressAsZip(dto);

      expect(addonService.addonCompressAsZip).toHaveBeenCalledWith(dto);
      expect(result).toEqual({
        status: ReturnStatus.Ok,
        message: 'Created archive.zip in root',
      });
    });
  });
});
