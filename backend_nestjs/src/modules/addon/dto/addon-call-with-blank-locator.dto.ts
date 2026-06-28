import {
  ArrayMinSize,
  IsArray,
  // IsIn,
  IsNotEmpty,
  IsString,
} from 'class-validator';

export class AddonCallWithBlankLocatorDto {
  @IsArray()
  @ArrayMinSize(0)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  locators: string[];

  @IsString()
  @IsNotEmpty()
  noteMessage: string;

  @IsString()
  currentFolderLocator: string;
}
