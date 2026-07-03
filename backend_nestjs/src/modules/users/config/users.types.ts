export interface UserConfigEntry {
  id: string;
  username: string;
  passwordHash: string;
  displayName: string;
}

export type UsersConfig = UserConfigEntry[];
