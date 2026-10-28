    import {
      CanActivate, ExecutionContext, Injectable, UnauthorizedException,
    } from '@nestjs/common';
    import { JwtService } from '@nestjs/jwt';

    interface TokenPayload {
      sub: string;
      orgId: string;
      role: string;
    }

    @Injectable()
    export class AuthGuard implements CanActivate {
      constructor(private readonly jwt: JwtService) {}

      async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const [type, token] = (request.headers.authorization ?? '').split(' ');
        if (type !== 'Bearer' || !token) throw new UnauthorizedException();

        try {
          const payload = await this.jwt.verifyAsync<TokenPayload>(token);
          request.user = { userId: payload.sub, orgId: payload.orgId, role: payload.role };
          return true;
        } catch {
          throw new UnauthorizedException();
        }
      }
    }