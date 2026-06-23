import { validate } from 'class-validator';
import { CreateFolderDto } from './create-folder.dto';

describe('CreateFolderDto', () => {
  it('accepts empty parentLocator for root folder creation', async () => {
    const dto = new CreateFolderDto();
    dto.parentLocator = '';
    dto.folderName = 'my-folder';

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('accepts relative parentLocator', async () => {
    const dto = new CreateFolderDto();
    dto.parentLocator = 'nestitems';
    dto.folderName = 'my-folder';

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects absolute parentLocator', async () => {
    const dto = new CreateFolderDto();
    dto.parentLocator = '/abs';
    dto.folderName = 'my-folder';

    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'parentLocator')).toBe(
      true,
    );
  });
});
