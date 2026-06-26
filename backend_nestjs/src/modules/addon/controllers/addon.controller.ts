import { Body, Controller, Post } from '@nestjs/common';
import { AddonDownloadAsZipDto } from '../dto/addon-download-as-zip.dto';
import { AddonService } from '../services/addon.service';
import type { AddonDownloadAsZipResponse } from '../services/addon.service';

@Controller()
export class AddonController {
  constructor(private readonly addonService: AddonService) {}

  @Post('addonDownloadAsZip')
  addonDownloadAsZip(
    @Body() dto: AddonDownloadAsZipDto,
  ): AddonDownloadAsZipResponse {
    return this.addonService.addonDownloadAsZip(dto);
  }
}
