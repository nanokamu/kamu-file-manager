import { Controller, HttpCode, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { AuthenticatedUser } from '../../users/interfaces/user.interface';
import { Public } from '../../../shared/decorators/public.decorator';
import type { AuthResponseDto } from '../dto/auth-response.dto';
import { AuthService } from '../services/auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  @UseGuards(AuthGuard('local'))
  login(
    @Request() req: { user: AuthenticatedUser },
  ): Promise<AuthResponseDto> {
    return this.authService.login(req.user);
  }
}
