import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { IsValidFolderName } from '../validators/is-valid-folder-name.validator';

export class CreateFolderDto {
  @IsString()
  @Matches(/^(?:[^/\\].*)?$/, {
    message: 'parentLocator must be a relative path',
  })
  parentLocator: string;

  @IsString()
  @IsNotEmpty()
  @IsValidFolderName()
  folderName: string;
}
