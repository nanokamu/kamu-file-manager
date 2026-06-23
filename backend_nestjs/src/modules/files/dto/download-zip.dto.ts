import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { MatchAtLeastOne } from '../validators/match-at-least-one.validator';

@MatchAtLeastOne(['locators', 'folderLocators'])
export class DownloadZipDto {
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(500, { each: true })
  @Matches(/^[^/\\].*$/, {
    each: true,
    message: 'locator must be a relative path',
  })
  locators?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(500, { each: true })
  @Matches(/^[^/\\].*$/, {
    each: true,
    message: 'zipPath must be a relative path',
  })
  zipPaths?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(500, { each: true })
  @Matches(/^[^/\\].*$/, {
    each: true,
    message: 'folderLocator must be a relative path',
  })
  folderLocators?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(500, { each: true })
  @Matches(/^[^/\\].*$/, {
    each: true,
    message: 'folderZipPath must be a relative path',
  })
  folderZipPaths?: string[];

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  archiveName?: string;
}
