export const AUTH_CONFIG = 'AUTH_CONFIG';

const DEFAULT_JWT_EXPIRES_IN = '1h';
const DEV_JWT_SECRET = 'dev-only-jwt-secret-change-in-production';

export interface AuthConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
}

export function createAuthConfig(
  env: NodeJS.ProcessEnv = process.env,
): AuthConfig {
  const jwtSecret = env.JWT_SECRET?.trim();
  const isProduction = env.NODE_ENV === 'production';

  if (!jwtSecret) {
    if (isProduction) {
      throw new Error('JWT_SECRET is required when NODE_ENV=production');
    }

    console.warn(
      '[auth] JWT_SECRET is not set; using insecure dev-only secret',
    );
  }

  return {
    jwtSecret: jwtSecret || DEV_JWT_SECRET,
    jwtExpiresIn: env.JWT_EXPIRES_IN?.trim() || DEFAULT_JWT_EXPIRES_IN,
  };
}
