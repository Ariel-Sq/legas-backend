import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { UsersService } from '@app/users/users.service';
import { AuthProvider, User } from '@app/users/entities/user.entity';
import { GOOGLE_CLIENT_ID } from '@app/utils/environments';
import { signAuthToken } from './jwt.util';

interface GoogleProfile {
  email: string;
  firstName: string;
  lastName: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

  constructor(private readonly usersService: UsersService) {}

  /**
   * Verify a Google-issued OpenID Connect id_token against Google's public
   * keys and our own client id (the `aud` claim). Throws if the token is
   * invalid, expired, or issued for a different client.
   */
  private async verifyGoogleIdToken(idToken: string): Promise<GoogleProfile> {
    if (!GOOGLE_CLIENT_ID) {
      throw new UnauthorizedException(
        'Google authentication is not configured',
      );
    }

    let payload;
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (err) {
      this.logger.warn(`Google id_token verification failed: ${String(err)}`);
      throw new UnauthorizedException('Invalid Google token');
    }

    if (!payload?.email) {
      throw new UnauthorizedException('Google token did not include an email');
    }
    if (payload.email_verified === false) {
      throw new UnauthorizedException('Google email is not verified');
    }

    const fallbackName = payload.email.split('@')[0];
    return {
      email: payload.email,
      firstName: payload.given_name || payload.name || fallbackName,
      lastName: payload.family_name || '',
    };
  }

  /**
   * Exchange a verified Google id_token for a backend session JWT. Provisions
   * the user on first sign-in (idempotent) and stamps the last-login time.
   */
  async loginWithGoogle(
    idToken: string,
  ): Promise<{ accessToken: string; user: User }> {
    const profile = await this.verifyGoogleIdToken(idToken);

    const user = await this.usersService.createOrFindOAuthUser({
      email: profile.email,
      firstName: profile.firstName,
      lastName: profile.lastName,
      authProvider: AuthProvider.GOOGLE,
    });

    await this.usersService.updateLastLogin(user.id);

    const accessToken = signAuthToken({
      sub: user.id,
      role: user.role,
      email: user.email,
    });

    return { accessToken, user };
  }
}
