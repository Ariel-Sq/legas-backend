import { Module } from '@nestjs/common';
import { UsersModule } from '@app/users/users.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

/**
 * Owns the login exchange: verify a Google id_token (AuthService) and issue
 * the backend session JWT. Token *verification* on inbound requests lives in
 * AuthMiddleware (jwt.util), which runs before any controller, so it does not
 * depend on this module.
 */
@Module({
  imports: [UsersModule],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
