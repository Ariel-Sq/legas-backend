import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiOperation,
  ApiProperty,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { GoogleLoginDto } from './dto/google-login.dto';
import { User } from '@app/users/entities/user.entity';

class GoogleLoginResponse {
  @ApiProperty({ description: 'Backend session JWT (send as Bearer token).' })
  accessToken: string;

  @ApiProperty({ type: User })
  user: User;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('google')
  @ApiOperation({
    summary: 'Exchange a Google id_token for a backend session JWT',
    description:
      'Called server-to-server by the NextAuth callback. Verifies the Google ' +
      'id_token against Google and the configured client id, provisions the ' +
      'user on first sign-in, and returns a backend-signed JWT to be sent as ' +
      'a Bearer token on subsequent requests.',
  })
  @ApiResponse({ status: 201, type: GoogleLoginResponse })
  @ApiResponse({
    status: 401,
    description: 'Invalid or unverified Google token.',
  })
  async google(@Body() dto: GoogleLoginDto): Promise<GoogleLoginResponse> {
    return this.authService.loginWithGoogle(dto.idToken);
  }
}
