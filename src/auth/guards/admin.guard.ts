import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { UsersService } from '@app/users/users.service';
import { UserRole } from '@app/users/entities/user.entity';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    if (!request.user) {
      throw new UnauthorizedException(
        'Authentication middleware not properly configured.',
      );
    }

    if (!request.user.isAuthenticated) {
      throw new UnauthorizedException(
        'User not authenticated. External provider authentication required.',
      );
    }

    const user = await this.usersService.findByIdSafe(request.user.id);
    if (!user) {
      throw new UnauthorizedException('User not found.');
    }

    if (user.role !== UserRole.OWNER && user.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Access denied: administrator permissions required',
      );
    }

    return true;
  }
}
