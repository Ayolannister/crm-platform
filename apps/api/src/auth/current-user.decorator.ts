    import { createParamDecorator, ExecutionContext } from '@nestjs/common';

    export interface AuthUser {
      userId: string;
      orgId: string;
      role: string;
    }

    export const CurrentUser = createParamDecorator(
      (_data: unknown, context: ExecutionContext): AuthUser =>
        context.switchToHttp().getRequest().user,
    );