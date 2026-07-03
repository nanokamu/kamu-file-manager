import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Query,
  Req,
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../users/interfaces/user.interface';
import { CopyFileDto } from '../dto/copy-file.dto';
import { MoveFileDto } from '../dto/move-file.dto';
import { CreateFolderDto } from '../dto/create-folder.dto';
import { DownloadZipDto } from '../dto/download-zip.dto';
import { FileQueryDto } from '../dto/file-query.dto';
import { UploadFileQueryDto } from '../dto/upload-file-query.dto';
import { UnifiedResource } from '../interfaces/resource.interface';
import { FilesService } from '../services/files.service';

@Controller()
export class FilesController {
  // eslint-disable-next-line prettier/prettier
  constructor(private readonly filesService: FilesService) { }

  @Get('filelist')
  async listFiles(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ files: string[] }> {
    const files = await this.filesService.listFiles(user.id);
    return { files };
  }

  @Get('files')
  list(
    @Query() query: FileQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UnifiedResource[]> {
    return this.filesService.list(query.locator, user.id);
  }

  @Get('files/metadata')
  getMetadata(
    @Query('locator') locator: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UnifiedResource> {
    return this.filesService.getMetadata(locator, user.id);
  }

  @Post('files/download/zip')
  async downloadZip(
    @Body() dto: DownloadZipDto,
    @Res({ passthrough: true }) res: Response,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<StreamableFile> {
    const { stream, archiveName, checksum, size } =
      await this.filesService.downloadZip(dto, user.id);

    if (checksum) {
      res.set({
        'X-Checksum-Algorithm': checksum.algorithm,
        'X-Checksum-Value': checksum.value,
      });
    }

    return new StreamableFile(stream, {
      type: 'application/zip',
      disposition: `attachment; filename="${archiveName}"`,
      length: size,
    });
  }

  @Get('files/download')
  async download(
    @Query('locator') locator: string,
    @Res({ passthrough: true }) res: Response,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<StreamableFile> {
    const { stream, mimeType, size, checksum, resource } =
      await this.filesService.download(locator, user.id);

    if (checksum) {
      res.set({
        'X-Checksum-Algorithm': checksum.algorithm,
        'X-Checksum-Value': checksum.value,
      });
    }

    return new StreamableFile(stream, {
      type: mimeType ?? 'application/octet-stream',
      disposition: `attachment; filename="${resource.name}"`,
      length: size,
    });
  }

  @Post('files/upload')
  upload(
    @Query() query: UploadFileQueryDto,
    @Req() req: Request,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UnifiedResource> {
    return this.filesService.upload(
      query.locator,
      query.fileName,
      req,
      query,
      user.id,
    );
  }

  @Post('files/folders')
  createFolder(
    @Body() dto: CreateFolderDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UnifiedResource> {
    return this.filesService.createFolder(
      dto.parentLocator,
      dto.folderName,
      user.id,
    );
  }

  @Post('files/copy')
  copy(
    @Body() dto: CopyFileDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UnifiedResource> {
    return this.filesService.copy(
      dto.sourceLocator,
      dto.destinationLocator,
      user.id,
      {
        overwrite: dto.overwrite,
        recursive: dto.recursive,
      },
    );
  }

  @Post('files/move')
  move(
    @Body() dto: MoveFileDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<UnifiedResource> {
    return this.filesService.move(
      dto.sourceLocator,
      dto.destinationLocator,
      user.id,
      {
        overwrite: dto.overwrite,
        recursive: dto.recursive,
      },
    );
  }

  @Delete('files')
  delete(
    @Query('locator') locator: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.filesService.delete(locator, user.id);
  }
}
