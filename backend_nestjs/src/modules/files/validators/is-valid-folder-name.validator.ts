import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

const MAX_FOLDER_NAME_LENGTH = 255;
const INVALID_FOLDER_NAMES = new Set(['.', '..']);

@ValidatorConstraint({ name: 'isValidFolderName', async: false })
class IsValidFolderNameConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string') {
      return false;
    }

    if (value.length === 0 || value.length > MAX_FOLDER_NAME_LENGTH) {
      return false;
    }

    if (value !== value.trim()) {
      return false;
    }

    if (value.includes('/') || value.includes('\\') || value.includes('\0')) {
      return false;
    }

    if (/[\x00-\x1f\x7f]/.test(value)) {
      return false;
    }

    return !INVALID_FOLDER_NAMES.has(value);
  }

  defaultMessage(): string {
    return 'folderName must be a valid single folder name without path separators';
  }
}

export function IsValidFolderName(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (object: object, propertyName: string | symbol) => {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      constraints: [],
      validator: IsValidFolderNameConstraint,
    });
  };
}
