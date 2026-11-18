import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { and, count, desc, eq } from 'drizzle-orm';
import { Inject } from '@nestjs/common';
import { DB } from '../db/db.tokens.js';
import type { Database } from '../db/tenant-db.service.js';
import { TenantDb } from '../db/tenant-db.service.js';
import { contacts, memberships, organizations, platformAdmins, users } from '../db/schema.js';

type MembershipRole = 'owner' | 'admin' | 'member';
type Actor = { userId: string; orgId: string };

@Injectable()
export class AdminService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly tenantDb: TenantDb,
  ) {}

  private async orgRole(actor: Actor): Promise<MembershipRole> {
    const [row] = await this.db.select({ role: memberships.role }).from(memberships)
      .where(and(eq(memberships.userId, actor.userId), eq(memberships.orgId, actor.orgId))).limit(1);
    if (!row || (row.role !== 'owner' && row.role !== 'admin')) {
      throw new ForbiddenException('Organization admin access required');
    }
    return row.role;
  }

  private async requirePlatformAdmin(actor: Actor) {
    const [row] = await this.db.select({ userId: platformAdmins.userId })
      .from(platformAdmins).where(eq(platformAdmins.userId, actor.userId)).limit(1);
    if (!row) throw new ForbiddenException('Platform administrator access required');
  }

  async context(actor: Actor) {
    const [membership] = await this.db.select({
      role: memberships.role, orgName: organizations.name,
    }).from(memberships).innerJoin(organizations, eq(memberships.orgId, organizations.id))
      .where(and(eq(memberships.userId, actor.userId), eq(memberships.orgId, actor.orgId))).limit(1);
    if (!membership) throw new ForbiddenException('Organization membership is no longer valid');
    const [platform] = await this.db.select({ userId: platformAdmins.userId })
      .from(platformAdmins).where(eq(platformAdmins.userId, actor.userId)).limit(1);
    return { orgId: actor.orgId, orgName: membership.orgName, role: membership.role,
      organizationAdmin: membership.role === 'owner' || membership.role === 'admin',
      platformAdmin: !!platform };
  }

  async organization(actor: Actor) {
    const role = await this.orgRole(actor);
    const [org] = await this.db.select({ id: organizations.id, name: organizations.name,
      slug: organizations.slug, createdAt: organizations.createdAt })
      .from(organizations).where(eq(organizations.id, actor.orgId)).limit(1);
    if (!org) throw new NotFoundException('Organization not found');
    const team = await this.db.select({
      userId: users.id, email: users.email, role: memberships.role,
      joinedAt: memberships.createdAt
    }).from(memberships).innerJoin(users, eq(memberships.userId, users.id))
      .where(eq(memberships.orgId, actor.orgId)).orderBy(desc(memberships.createdAt));
    const [stats] = await this.tenantDb.run(actor.orgId, tx =>
      tx.select({ total: count() }).from(contacts));
    return { organization: org, role, members: team, totalContacts: Number(stats?.total ?? 0) };
  }

  async addMember(actor: Actor, email: string, role: 'member' | 'admin') {
    const actorRole = await this.orgRole(actor);
    if (role === 'admin' && actorRole !== 'owner') {
      throw new ForbiddenException('Only owners can assign admin permissions');
    }
    const [target] = await this.db.select({id:users.id}).from(users)
      .where(eq(users.email, email.trim().toLowerCase())).limit(1);
    if (!target) throw new NotFoundException('User must register an Infiniti account first');
    const [existing] = await this.db.select({userId:memberships.userId}).from(memberships)
      .where(and(eq(memberships.orgId,actor.orgId),eq(memberships.userId,target.id))).limit(1);
    if (existing) throw new ConflictException('User is already in this organization');
    await this.db.insert(memberships).values({orgId:actor.orgId,userId:target.id,role});
    return { added: true };
  }

  async updateMember(actor: Actor, userId: string, role: 'member' | 'admin') {
    if (await this.orgRole(actor) !== 'owner') {
      throw new ForbiddenException('Only owners can change member roles');
    }
    const [target] = await this.db.select({role:memberships.role}).from(memberships)
      .where(and(eq(memberships.userId,userId),eq(memberships.orgId,actor.orgId))).limit(1);
    if (!target) throw new NotFoundException('Member not found');
    if (target.role === 'owner') throw new ForbiddenException('Organization owner role cannot be modified');
    await this.db.update(memberships).set({role})
      .where(and(eq(memberships.userId,userId),eq(memberships.orgId,actor.orgId)));
    return {updated:true};
  }

  async removeMember(actor: Actor, userId: string) {
    if (await this.orgRole(actor) !== 'owner') {
      throw new ForbiddenException('Only owners can remove organization members');
    }
    const [target] = await this.db.select({role:memberships.role}).from(memberships)
      .where(and(eq(memberships.userId,userId),eq(memberships.orgId,actor.orgId))).limit(1);
    if (!target) throw new NotFoundException('Member not found');
    if (target.role === 'owner') throw new ForbiddenException('Cannot remove the owner');
    await this.db.delete(memberships)
      .where(and(eq(memberships.userId,userId),eq(memberships.orgId,actor.orgId)));
    return {removed:true};
  }

  async platform(actor: Actor) {
    await this.requirePlatformAdmin(actor);
    const [orgCount] = await this.db.select({value:count()}).from(organizations);
    const [userCount] = await this.db.select({value:count()}).from(users);
    const [memberCount] = await this.db.select({value:count()}).from(memberships);
    const orgs = await this.db.select({
      id:organizations.id,name:organizations.name,slug:organizations.slug,
      createdAt:organizations.createdAt,
    }).from(organizations).orderBy(desc(organizations.createdAt)).limit(100);
    return { totals: { organizations:Number(orgCount?.value ?? 0),
      users:Number(userCount?.value ?? 0), memberships:Number(memberCount?.value ?? 0) },
      organizations:orgs, capped:orgCount && Number(orgCount.value)>100 };
  }
}
