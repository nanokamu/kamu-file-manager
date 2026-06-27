import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsString,
} from 'class-validator';

const ARCHIVE_TYPES = [
  'zip',
  'tar',
  'tar.gz',
  'tar.bz2',
  'tar.xz',
  'tar.zst',
] as const;

export class AddonDownloadAsZipDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  locators: string[];

  @IsString()
  @IsNotEmpty()
  archiveName: string;

  @IsString()
  @IsIn(ARCHIVE_TYPES)
  archiveType: string;

  @IsString()
  currentFolderLocator: string;
}
