import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AuthenticatedUser } from '../../users/interfaces/user.interface';
import type { UserRecord } from '../../users/interfaces/user.interface';
import { UsersService } from '../../users/services/users.service';
import type { AuthResponseDto } from '../dto/auth-response.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(user: AuthenticatedUser): Promise<AuthResponseDto> {
    const record = this.usersService.findById(user.id);
    if (!record) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.buildAuthResponse(record);
  }

  async validateUser(
    username: string,
    password: string,
  ): Promise<AuthenticatedUser | null> {
    const user = this.usersService.findByUsername(username);
    if (!user) {
      return null;
    }

    const isValid = await this.usersService.validatePassword(user, password);
    if (!isValid) {
      return null;
    }

    return { id: user.id, username: user.username };
  }

  private buildAuthResponse(user: UserRecord): AuthResponseDto {
    const payload = { sub: user.id, username: user.username };
    return {
      accessToken: this.jwtService.sign(payload),
      user: this.usersService.toPublicUser(user),
    };
  }
}
