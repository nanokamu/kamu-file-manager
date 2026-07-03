export interface UserRecord {
  id: string;
  username: string;
  passwordHash: string;
  displayName: string;
}

export interface AuthenticatedUser {
  id: string;
  username: string;
}
