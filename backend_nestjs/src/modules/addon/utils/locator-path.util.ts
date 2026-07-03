import { BadRequestException } from '@nestjs/common';
import { parentLocator } from '../../../shared/utils/locator-path.util';
import { ReturnStatus } from '../config/addon.types';

export { formatParentForMessage, joinLocator, parentLocator } from '../../../shared/utils/locator-path.util';

export function assertSameParentLevel(locators: string[]): string {
  if (locators.length === 0) {
    throw new BadRequestException({
      status: ReturnStatus.Error,
      message: 'At least one locator is required',
    });
  }

  const parents = locators.map(parentLocator);
  const uniqueParents = new Set(parents);

  if (uniqueParents.size !== 1) {
    throw new BadRequestException({
      status: ReturnStatus.Error,
      message: 'All locators must be in the same directory',
    });
  }

  return parents[0];
}
