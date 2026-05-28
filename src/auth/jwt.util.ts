import jwt from 'jsonwebtoken';
import { JWT_EXPIRES_IN, JWT_SECRET } from '@app/utils/environments';

/**
 * Claims carried by the backend-issued session JWT. `sub` is the user id;
 * `role` is included for convenience only — privileged guards (AdminGuard)
 * re-read the role from the database, so a stale role here never grants
 * access it shouldn't.
 */
export interface AuthTokenClaims {
  sub: string;
  role: string;
  email: string;
}

function getSecret(): string {
  if (!JWT_SECRET) {
    // Fail loudly: without a secret we cannot sign or verify anything safely.
    throw new Error('JWT_SECRET is not configured');
  }
  return JWT_SECRET;
}

/**
 * Sign a backend session token. Issued once after a Google id_token has been
 * verified server-side (see AuthService).
 */
export function signAuthToken(claims: AuthTokenClaims): string {
  return jwt.sign(claims, getSecret(), {
    algorithm: 'HS256',
    expiresIn: JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

/**
 * Verify a backend session token. Returns the decoded claims, or null when the
 * token is missing, malformed, expired, or signed with the wrong key.
 */
export function verifyAuthToken(token: string): AuthTokenClaims | null {
  try {
    const decoded = jwt.verify(token, getSecret(), {
      algorithms: ['HS256'],
    });
    if (typeof decoded === 'string') return null;
    const { sub, role, email } = decoded;
    if (typeof sub !== 'string') return null;
    return { sub, role: String(role ?? ''), email: String(email ?? '') };
  } catch {
    return null;
  }
}
