import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class MoveFileDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[^/\\].*$/, {
    message: 'sourceLocator must be a relative path',
  })
  sourceLocator: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[^/\\].*$/, {
    message: 'destinationLocator must be a relative path',
  })
  destinationLocator: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  overwrite?: boolean;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  recursive?: boolean;
}
