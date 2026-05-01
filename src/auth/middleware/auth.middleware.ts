import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

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
 * SECURITY MODEL: `x-user-id` is trusted as-is. The deployment relies on an
 * upstream gateway (or VPN/network boundary for the admin surface) to strip
 * any client-supplied `x-user-id` before forwarding. Replace with JWT
 * verification when issuance is implemented (see TODO.md).
 */
@Injectable()
export class AuthMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const userId = req.headers['x-user-id'] as string;

    if (userId) {
      // Authenticated user from external provider
      req.user = {
        id: userId,
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
        secure: process.env.NODE_ENV === 'production',
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
   * Static method to get user info from request (for use in decorators)
   * @param req Express request object
   * @returns User identification info
   */
  static getUserInfo(req: Request): { userId?: string; sessionId?: string } {
    const userId = req.headers['x-user-id'] as string;
    const sessionId =
      req.cookies?.[SESSION_CONFIG.cookieName] ||
      (req.headers['x-session-id'] as string);

    return { userId, sessionId };
  }
}
