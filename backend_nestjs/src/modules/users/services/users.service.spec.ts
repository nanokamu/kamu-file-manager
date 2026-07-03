import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import * as bcrypt from 'bcrypt';
import { validateUsersConfig } from '../config/users.config';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let tempDir: string;
  let configPath: string;
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await bcrypt.hash('secret123', 10);
    tempDir = mkdtempSync(join(tmpdir(), 'users-config-'));
    configPath = join(tempDir, 'users.json');
  });

  beforeEach(() => {
    writeFileSync(
      configPath,
      JSON.stringify([
        {
          id: 'user_a',
          username: 'alice',
          passwordHash,
          displayName: 'Alice',
        },
        {
          id: 'user_b',
          username: 'bob',
          passwordHash,
          displayName: 'Bob',
        },
      ]),
    );

    service = new UsersService();
    service.loadUsers({ USERS_CONFIG_PATH: configPath });
  });

  it('finds users by id and username', () => {
    expect(service.findById('user_a')?.username).toBe('alice');
    expect(service.findByUsername('bob')?.id).toBe('user_b');
  });

  it('validates password', async () => {
    const user = service.findByUsername('alice');
    expect(user).toBeDefined();
    await expect(service.validatePassword(user!, 'secret123')).resolves.toBe(
      true,
    );
    await expect(service.validatePassword(user!, 'wrong')).resolves.toBe(false);
  });

  it('strips password hash from public user', () => {
    const user = service.findById('user_a');
    expect(user).toBeDefined();
    expect(service.toPublicUser(user!)).toEqual({
      id: 'user_a',
      username: 'alice',
      displayName: 'Alice',
    });
  });
});

describe('validateUsersConfig', () => {
  const validHash =
    '$2b$10$vYa3.4/d2P4JmgB/RqZdpOg4rgpJzyZ9Gut8/IwCF2DiES7OTa8xq';

  it('rejects duplicate ids', () => {
    expect(() =>
      validateUsersConfig([
        {
          id: 'dup',
          username: 'one',
          passwordHash: validHash,
          displayName: 'One',
        },
        {
          id: 'dup',
          username: 'two',
          passwordHash: validHash,
          displayName: 'Two',
        },
      ]),
    ).toThrow('Duplicate user id');
  });

  it('rejects invalid user ids', () => {
    expect(() =>
      validateUsersConfig([
        {
          id: '../bad',
          username: 'bad',
          passwordHash: validHash,
          displayName: 'Bad',
        },
      ]),
    ).toThrow('Invalid user id');
  });
});
