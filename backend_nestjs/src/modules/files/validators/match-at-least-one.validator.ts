import {
  Validate,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'matchAtLeastOne', async: false })
class MatchAtLeastOneConstraint implements ValidatorConstraintInterface {
  validate(_: unknown, args: ValidationArguments) {
    const [fields] = args.constraints as [string[]];
    const obj = args.object as Record<string, unknown>;
    return fields.some(
      (field) => Array.isArray(obj[field]) && obj[field].length >= 1,
    );
  }

  defaultMessage(args: ValidationArguments) {
    const [fields] = args.constraints as [string[]];
    return `At least one of the following fields must be a non-empty array: ${fields.join(', ')}`;
  }
}

export function MatchAtLeastOne(
  fields: string[],
  validationOptions?: ValidationOptions,
): ClassDecorator {
  return Validate(
    MatchAtLeastOneConstraint,
    fields,
    validationOptions,
  ) as ClassDecorator;
}
