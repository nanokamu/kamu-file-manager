import { IsOptional, IsString } from 'class-validator';

export class FileQueryDto {
  @IsOptional()
  @IsString()
  locator?: string;
}
