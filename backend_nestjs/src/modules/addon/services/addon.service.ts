import { Injectable } from '@nestjs/common';
import { AddonDownloadAsZipDto } from '../dto/addon-download-as-zip.dto';

export interface AddonDownloadAsZipResponse {
  status: string;
  message: string;
  locators: string[];
  archiveName: string;
  archiveType: string;
}

@Injectable()
export class AddonService {
  addonDownloadAsZip(dto: AddonDownloadAsZipDto): AddonDownloadAsZipResponse {
    return {
      status: 'ok',
      message: 'addonDownloadAsZip dummy endpoint',
      locators: dto.locators,
      archiveName: dto.archiveName,
      archiveType: dto.archiveType,
    };
  }
}
