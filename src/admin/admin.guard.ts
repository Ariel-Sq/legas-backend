import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UsersService } from '@app/users/users.service';
import { UserRole } from '@app/users/entities/user.entity';
import type { AuthenticatedUser } from '@app/auth/middleware/auth.middleware';

export const ROLES_KEY = 'admin_roles';
/** Restrict a route to the given roles (defaults to owner + admin). */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

export interface AdminActor {
  id: string;
  email: string;
  role: UserRole;
  isOwner: boolean;
}

/**
 * Gate for every /admin endpoint.
 *
 * The role is re-read from the database on each request (never trusted from
 * the JWT), so demoting someone takes effect immediately. The owner email is
 * configured with OWNER_EMAIL and always resolves to `owner`, which keeps the
 * panel reachable even if rows get edited by hand.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authUser = request.user as AuthenticatedUser | undefined;

    if (!authUser?.isAuthenticated) {
      throw new UnauthorizedException('Iniciá sesión para entrar al panel');
    }

    const user = await this.usersService.findByIdSafe(authUser.id);
    if (!user) {
      throw new UnauthorizedException('Tu sesión quedó desactualizada');
    }

    const ownerEmail = (process.env.OWNER_EMAIL || '').toLowerCase();
    const isOwner =
      Boolean(ownerEmail) && user.email.toLowerCase() === ownerEmail;
    const role = isOwner ? UserRole.OWNER : user.role;

    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]) ?? [UserRole.OWNER, UserRole.ADMIN];

    if (!required.includes(role)) {
      throw new ForbiddenException('No tenés permisos para esta acción');
    }

    const actor: AdminActor = {
      id: user.id,
      email: user.email,
      role,
      isOwner,
    };
    request.adminUser = actor;
    return true;
  }
}
