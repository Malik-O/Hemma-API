import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** Extracts the authenticated user from the request (set by JwtStrategy) */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as { uid: string; email: string };
  },
);
