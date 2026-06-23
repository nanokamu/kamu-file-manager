import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

const VISIBILITY_VALUES = ['public', 'private'] as const;
const CHECKSUM_ALGORITHMS = ['md5', 'sha256', 'crc32c'] as const;

export class UploadFileQueryDto {
  @IsString()
  locator: string;

  @IsString()
  @IsNotEmpty()
  fileName: string;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  size: number;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  overwrite?: boolean;

  @IsOptional()
  @IsIn(VISIBILITY_VALUES)
  visibility?: (typeof VISIBILITY_VALUES)[number];

  @IsIn(CHECKSUM_ALGORITHMS)
  checksumAlgorithm: (typeof CHECKSUM_ALGORITHMS)[number];

  @IsString()
  @IsNotEmpty()
  checksumValue: string;
}
