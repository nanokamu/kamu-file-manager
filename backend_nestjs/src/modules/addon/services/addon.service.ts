import { BadRequestException, Injectable } from '@nestjs/common';
import type { Readable } from 'node:stream';
import { ADDON_MAX_ENVELOPE_BYTES } from '../config/addon.constants';
import type {
  ReturnTemplateMessage,
  ReturnTemplateWithFile,
} from '../config/addon.types';
import { ReturnStatus } from '../config/addon.types';
import { AddonCompressAsZipDto } from '../dto/addon-compress-as-zip.dto';
import { AddonDownloadAsZipDto } from '../dto/addon-download-as-zip.dto';
import {
  buildEnvelopeHeader,
  createEnvelopeStream,
  getEnvelopeContentLength,
} from '../utils/addon-envelope.util';
import { mimeTypeForArchive } from '../utils/mime-type.util';
import {
  assertSameParentLevel,
  formatParentForMessage,
} from '../utils/locator-path.util';
import { FilesService } from '../../files/services/files.service';
import type { CompressLocatorsToZipFileResult } from '../../files/services/files.service';

export interface AddonEnvelopeResult {
  stream: Readable;
  contentLength: number;
}

@Injectable()
export class AddonService {
  // eslint-disable-next-line prettier/prettier
  constructor(private readonly filesService: FilesService) { }

  async addonDownloadAsZip(
    dto: AddonDownloadAsZipDto,
  ): Promise<AddonEnvelopeResult> {
    if (dto.archiveType !== 'zip') {
      throw new BadRequestException({
        status: ReturnStatus.Error,
        message: `Archive type "${dto.archiveType}" is not supported yet`,
      });
    }

    return this.buildZipEnvelope(
      { locators: dto.locators, archiveName: dto.archiveName },
      'addonDownloadAsZip completed',
    );
  }

  async addonCompressAsZip(
    dto: AddonCompressAsZipDto,
  ): Promise<ReturnTemplateMessage> {
    const parentLocator = assertSameParentLevel(dto.locators);
    const saveResult: CompressLocatorsToZipFileResult =
      await this.filesService.compressLocatorsToZipFile(
        parentLocator,
        dto.locators,
        dto.archiveName,
      );

    return {
      status: ReturnStatus.Ok,
      message: `Created ${saveResult.savedName} in ${formatParentForMessage(parentLocator)}`,
    };
  }

  private async buildZipEnvelope(
    dto: { locators: string[]; archiveName: string },
    message: string,
  ): Promise<AddonEnvelopeResult> {
    const result = await this.filesService.downloadZip({
      locators: dto.locators,
      archiveName: dto.archiveName,
    });

    if (result.size > ADDON_MAX_ENVELOPE_BYTES) {
      throw new BadRequestException({
        status: ReturnStatus.Error,
        message: `Archive exceeds maximum addon envelope size of ${ADDON_MAX_ENVELOPE_BYTES} bytes`,
      });
    }

    const metadata: ReturnTemplateWithFile = {
      status: ReturnStatus.Ok,
      filename: result.archiveName,
      mimeType: mimeTypeForArchive('zip'),
      message,
    };
    const metaLen = buildEnvelopeHeader(metadata).length - 4;
    const contentLength = getEnvelopeContentLength(metaLen, result.size);
    const stream = createEnvelopeStream(metadata, result.stream);

    return { stream, contentLength };
  }
}
