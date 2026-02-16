import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  /**
   * Optionally allow unauthenticated access.
   * Override canActivate if you need optional auth in some routes.
   */
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }
}
