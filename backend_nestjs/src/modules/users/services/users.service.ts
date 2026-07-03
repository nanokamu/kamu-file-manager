import { Injectable, OnModuleInit } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { loadUsersConfig } from '../config/users.config';
import type { UserRecord } from '../interfaces/user.interface';
import type { UserResponseDto } from '../dto/user-response.dto';

@Injectable()
export class UsersService implements OnModuleInit {
  private usersById = new Map<string, UserRecord>();
  private usersByUsername = new Map<string, UserRecord>();

  onModuleInit(): void {
    this.loadUsers();
  }

  loadUsers(env: NodeJS.ProcessEnv = process.env): void {
    const config = loadUsersConfig(env);
    this.usersById.clear();
    this.usersByUsername.clear();

    for (const entry of config) {
      const user: UserRecord = { ...entry };
      this.usersById.set(user.id, user);
      this.usersByUsername.set(user.username, user);
    }
  }

  findById(id: string): UserRecord | undefined {
    return this.usersById.get(id);
  }

  findByUsername(username: string): UserRecord | undefined {
    return this.usersByUsername.get(username);
  }

  async validatePassword(
    user: UserRecord,
    plainPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, user.passwordHash);
  }

  toPublicUser(user: UserRecord): UserResponseDto {
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
    };
  }
}
