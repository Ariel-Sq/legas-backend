import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * Body for POST /api/auth/google. The frontend (NextAuth callback) forwards
 * the Google-issued OpenID Connect id_token; the backend verifies it and
 * returns its own session JWT.
 */
export class GoogleLoginDto {
  @ApiProperty({
    description: 'Google OpenID Connect id_token obtained during sign-in.',
  })
  @IsString()
  @IsNotEmpty()
  idToken: string;
}
