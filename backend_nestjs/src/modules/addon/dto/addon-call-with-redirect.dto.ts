import {
  ArrayMinSize,
  IsArray,
  // IsIn,
  IsNotEmpty,
  IsString,
} from 'class-validator';

export class AddonCallWithRedirectDto {
  @IsArray()
  @ArrayMinSize(0)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  locators: string[];

  @IsString()
  @IsNotEmpty()
  archiveName: string;

  @IsString()
  currentFolderLocator: string;
}
