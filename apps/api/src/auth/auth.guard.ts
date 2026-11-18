import {
  CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { and, eq } from 'drizzle-orm';
import { DB } from '../db/db.tokens.js';
import type { Database } from '../db/tenant-db.service.js';
import { memberships } from '../db/schema.js';

interface TokenPayload {
  sub: string;
  orgId: string;
  role: string;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    @Inject(DB) private readonly db: Database,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const [type, token] = (request.headers.authorization ?? '').split(' ');
    if (type !== 'Bearer' || !token) throw new UnauthorizedException();

    try {
      const payload = await this.jwt.verifyAsync<TokenPayload>(token);
      if (!payload.sub || !payload.orgId) throw new UnauthorizedException();
      // Revalidate membership on every request so role changes and removals
      // immediately invalidate access even while the 15-minute JWT is valid.
      const [member] = await this.db.select({role: memberships.role})
        .from(memberships)
        .where(and(eq(memberships.userId,payload.sub),eq(memberships.orgId,payload.orgId)))
        .limit(1);
      if (!member) throw new UnauthorizedException();
      request.user = {userId:payload.sub,orgId:payload.orgId,role:member.role};
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
