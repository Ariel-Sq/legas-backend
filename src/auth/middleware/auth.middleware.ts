import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID as uuidv4 } from 'node:crypto';
import { IS_PRODUCTION } from '@app/utils/environments';
import { verifyAuthToken } from '@app/auth/jwt.util';

// User object interface for request extension
export interface AuthenticatedUser {
  id: string;
  type: 'authenticated' | 'anonymous';
  isAuthenticated: boolean;
  isAnonymous: boolean;
}

// Extend Express Request interface to include user property
declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthenticatedUser;
  }
}

// Session configuration constants
const SESSION_CONFIG = {
  cookieName: 'sessionId',
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  httpOnly: true,
} as const;

/**
 * Unified middleware for handling both authenticated and anonymous users.
 *
 * SECURITY MODEL: authenticated identity comes solely from a backend-issued
 * JWT sent as `Authorization: Bearer <token>`. The token is signed by this
 * service (see jwt.util) after a Google id_token was verified at login
 * (AuthService), so it cannot be forged by a client. This is identical in
 * development and production — there is no header-based bypass.
 */
@Injectable()
export class AuthMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const authenticatedId = AuthMiddleware.resolveAuthenticatedId(req);

    if (authenticatedId) {
      req.user = {
        id: authenticatedId,
        type: 'authenticated',
        isAuthenticated: true,
        isAnonymous: false,
      };
    } else {
      // Anonymous user - manage session
      const sessionId = this.getOrCreateSessionId(req, res);

      req.user = {
        id: sessionId,
        type: 'anonymous',
        isAuthenticated: false,
        isAnonymous: true,
      };
    }

    next();
  }

  /**
   * Resolve a verified user id from the request, or null if the caller is not
   * authenticated. Identity comes only from a valid Bearer JWT. A present-but-
   * invalid token is treated as anonymous rather than a hard 401 here; route
   * guards decide whether authentication is required.
   */
  private static resolveAuthenticatedId(req: Request): string | null {
    const bearer = AuthMiddleware.extractBearerToken(req);
    if (!bearer) return null;
    const claims = verifyAuthToken(bearer);
    return claims ? claims.sub : null;
  }

  private static extractBearerToken(req: Request): string | null {
    const header = req.headers['authorization'];
    if (typeof header !== 'string') return null;
    const [scheme, token] = header.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
    return token.trim();
  }

  /**
   * Get existing session ID or create a new one
   * @param req Express request object
   * @param res Express response object
   * @returns Session ID
   */
  private getOrCreateSessionId(req: Request, res: Response): string {
    // Check for existing session in cookies or headers
    let sessionId =
      req.cookies?.[SESSION_CONFIG.cookieName] ||
      (req.headers['x-session-id'] as string);

    if (!sessionId) {
      // Create new session
      sessionId = uuidv4();

      // Set cookie for browser-based clients
      res.cookie(SESSION_CONFIG.cookieName, sessionId, {
        httpOnly: SESSION_CONFIG.httpOnly,
        maxAge: SESSION_CONFIG.maxAge,
        secure: IS_PRODUCTION,
        sameSite: 'lax',
      });

      // Set in request cookies for server-side access
      if (req.cookies) {
        req.cookies[SESSION_CONFIG.cookieName] = sessionId;
      }
    }

    return sessionId;
  }

  /**
   * Static helper to get user info from request (for use in decorators).
   * Reads the identity that `use()` already resolved onto `req.user`, so the
   * decorator and the guards always agree on who the caller is.
   * @param req Express request object
   * @returns User identification info
   */
  static getUserInfo(req: Request): { userId?: string; sessionId?: string } {
    const user = req.user;
    if (user?.isAuthenticated) {
      return { userId: user.id };
    }
    return { sessionId: user?.id };
  }
}
