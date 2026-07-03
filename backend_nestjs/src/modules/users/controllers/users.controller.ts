import { Controller, Get, NotFoundException } from '@nestjs/common';
import type { AuthenticatedUser } from '../interfaces/user.interface';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import type { UserResponseDto } from '../dto/user-response.dto';
import { UsersService } from '../services/users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getMe(@CurrentUser() user: AuthenticatedUser): UserResponseDto {
    const record = this.usersService.findById(user.id);
    if (!record) {
      throw new NotFoundException('User not found');
    }

    return this.usersService.toPublicUser(record);
  }
}
