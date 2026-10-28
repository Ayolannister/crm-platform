    import {
      ConflictException, Inject, Injectable, UnauthorizedException,
    } from '@nestjs/common';
    import { JwtService } from '@nestjs/jwt';
    import { asc, eq } from 'drizzle-orm';
    import { DB } from '../db/db.tokens.js';
    import type { Database } from '../db/tenant-db.service.js';
    import { memberships, organizations, users } from '../db/schema.js';
    import { hashPassword, verifyPassword } from './password.js';
    import { LoginDto, SignupDto } from './dto.js';

    function isUniqueViolation(err: unknown): boolean {
      const e = err as { code?: string; cause?: { code?: string } };
      return e.code === '23505' || e.cause?.code === '23505';
    }

    @Injectable()
    export class AuthService {
      constructor(
        @Inject(DB) private readonly db: Database,
        private readonly jwt: JwtService,
      ) {}

      async signup(dto: SignupDto) {
        const passwordHash = await hashPassword(dto.password);
        try {
          return await this.db.transaction(async (tx) => {
            const [org] = await tx
              .insert(organizations)
              .values({ name: dto.orgName, slug: dto.orgSlug })
              .returning();
            const [user] = await tx
              .insert(users)
              .values({ email: dto.email.toLowerCase(), passwordHash })
              .returning();
            await tx.insert(memberships).values({ userId: user.id, orgId: org.id, role: 'owner' });
            return this.issueToken(user.id, org.id, 'owner');
          });
        } catch (err) {
          if (isUniqueViolation(err)) {
            throw new ConflictException('Email or organization slug already in use');
          }
          throw err;
        }
      }

      async login(dto: LoginDto) {
        const [user] = await this.db
          .select()
          .from(users)
          .where(eq(users.email, dto.email.toLowerCase()))
          .limit(1);

        const valid = user ? await verifyPassword(dto.password, user.passwordHash) : false;
        if (!user || !valid) throw new UnauthorizedException('Invalid email or password');

        const [membership] = await this.db
          .select()
          .from(memberships)
          .where(eq(memberships.userId, user.id))
          .orderBy(asc(memberships.createdAt))
          .limit(1);
        if (!membership) throw new UnauthorizedException('No organization access');

        return this.issueToken(user.id, membership.orgId, membership.role);
      }

      private async issueToken(userId: string, orgId: string, role: string) {
        const accessToken = await this.jwt.signAsync({ sub: userId, orgId, role });
        return { accessToken, tokenType: 'Bearer', expiresIn: 900 };
      }
    }