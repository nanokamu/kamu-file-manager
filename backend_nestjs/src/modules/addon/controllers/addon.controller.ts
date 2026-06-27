import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';
import { addonConfig } from '../config/addon.config';
import { ADDON_ENVELOPE_CONTENT_TYPE } from '../config/addon.constants';
import type {
  AddonConfig,
  ReturnTemplateMessage,
  ReturnTemplateRedirect,
} from '../config/addon.types';
import { AddonCompressAsZipDto } from '../dto/addon-compress-as-zip.dto';
import { AddonDownloadAsZipDto } from '../dto/addon-download-as-zip.dto';
import { AddonService } from '../services/addon.service';
import { AddonCallWithBlankLocatorDto } from '../dto/addon-call-with-blank-locator.dto';
import {
  RedirectMode,
  RedirectType,
  ReturnStatus,
} from '../config/addon.types';
import { AddonCallWithRedirectDto } from '../dto/addon-call-with-redirect.dto';

@Controller()
export class AddonController {
  // eslint-disable-next-line prettier/prettier
  constructor(private readonly addonService: AddonService) { }

  @Get('addon/config')
  getConfig(): AddonConfig {
    return addonConfig;
  }

  @Post('addonDownloadAsZip')
  @HttpCode(200)
  async addonDownloadAsZip(
    @Body() dto: AddonDownloadAsZipDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { stream, contentLength } =
      await this.addonService.addonDownloadAsZip(dto);

    res.set({
      'Content-Type': ADDON_ENVELOPE_CONTENT_TYPE,
      'Content-Length': String(contentLength),
    });

    return new StreamableFile(stream, {
      type: ADDON_ENVELOPE_CONTENT_TYPE,
      length: contentLength,
    });
  }

  @Post('addonCompressAsZip')
  @HttpCode(200)
  addonCompressAsZip(
    @Body() dto: AddonCompressAsZipDto,
  ): Promise<ReturnTemplateMessage> {
    return this.addonService.addonCompressAsZip(dto);
  }

  @Post('addonCallWithBlankLocator')
  @HttpCode(200)
  addonCallWithBlankLocator(
    @Body() dto: AddonCallWithBlankLocatorDto,
  ): Promise<ReturnTemplateMessage> {
    // dto.archiveName;
    const returnDummy: ReturnTemplateMessage = {
      status: ReturnStatus.Ok,
      message: `Call with Blank Locator Success: ${dto.locators.length}, ${dto.archiveName}`,
    };
    return Promise.resolve(returnDummy);
  }

  @Post('addonCallWithRedirect')
  @HttpCode(200)
  addonCallWithRedirect(
    @Body() dto: AddonCallWithRedirectDto,
  ): Promise<ReturnTemplateRedirect> {
    // Keep dto but just Don't use dto parameters in return value.
    const returnDummy: ReturnTemplateRedirect = {
      status: ReturnStatus.Ok,
      redirectUrl: '/editor?locator=docs%2Fbinary_test.txt',
      redirectType: RedirectType.SameSite,
      redirectMode: RedirectMode.NewTab,
      message: `Call with Redirect Success: ${dto.locators.length}, ${dto.archiveName}`,
    };
    return Promise.resolve(returnDummy);
  }
}
