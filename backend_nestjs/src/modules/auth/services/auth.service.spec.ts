import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import type { UserRecord } from '../../users/interfaces/user.interface';
import { UsersService } from '../../users/services/users.service';

describe('AuthService', () => {
  const user: UserRecord = {
    id: 'default',
    username: 'demo',
    passwordHash: '$2b$10$hash',
    displayName: 'Demo User',
  };

  let authService: AuthService;
  let usersService: jest.Mocked<Pick<UsersService, 'findById' | 'findByUsername' | 'validatePassword' | 'toPublicUser'>>;
  let jwtService: jest.Mocked<Pick<JwtService, 'sign'>>;

  beforeEach(() => {
    usersService = {
      findById: jest.fn(),
      findByUsername: jest.fn(),
      validatePassword: jest.fn(),
      toPublicUser: jest.fn(),
    };
    jwtService = {
      sign: jest.fn().mockReturnValue('signed-token'),
    };

    authService = new AuthService(
      usersService as unknown as UsersService,
      jwtService as unknown as JwtService,
    );
  });

  it('returns null for unknown username', async () => {
    usersService.findByUsername.mockReturnValue(undefined);
    await expect(
      authService.validateUser('missing', 'password'),
    ).resolves.toBeNull();
  });

  it('returns null for invalid password', async () => {
    usersService.findByUsername.mockReturnValue(user);
    usersService.validatePassword.mockResolvedValue(false);
    await expect(
      authService.validateUser('demo', 'wrong'),
    ).resolves.toBeNull();
  });

  it('returns authenticated user for valid credentials', async () => {
    usersService.findByUsername.mockReturnValue(user);
    usersService.validatePassword.mockResolvedValue(true);
    await expect(
      authService.validateUser('demo', 'changeme'),
    ).resolves.toEqual({ id: 'default', username: 'demo' });
  });

  it('signs jwt with user id and username', async () => {
    usersService.findById.mockReturnValue(user);
    usersService.toPublicUser.mockReturnValue({
      id: 'default',
      username: 'demo',
      displayName: 'Demo User',
    });

    await expect(
      authService.login({ id: 'default', username: 'demo' }),
    ).resolves.toEqual({
      accessToken: 'signed-token',
      user: {
        id: 'default',
        username: 'demo',
        displayName: 'Demo User',
      },
    });

    expect(jwtService.sign).toHaveBeenCalledWith({
      sub: 'default',
      username: 'demo',
    });
  });
});
