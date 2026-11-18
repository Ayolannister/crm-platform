import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthUser } from '../auth/current-user.decorator.js';
import { AdminService } from './admin.service.js';
import { AddMemberDto, SetMemberRoleDto } from './dto.js';

@Controller('admin')
@UseGuards(AuthGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('context')
  context(@CurrentUser() actor: AuthUser) { return this.admin.context(actor); }

  @Get('organization')
  organization(@CurrentUser() actor: AuthUser) { return this.admin.organization(actor); }

  @Post('organization/members')
  add(@CurrentUser() actor: AuthUser, @Body() dto: AddMemberDto) {
    return this.admin.addMember(actor,dto.email,dto.role);
  }

  @Patch('organization/members/:userId')
  update(@CurrentUser() actor: AuthUser, @Param('userId',ParseUUIDPipe) userId: string,
    @Body() dto: SetMemberRoleDto) {
    return this.admin.updateMember(actor,userId,dto.role);
  }

  @Delete('organization/members/:userId')
  remove(@CurrentUser() actor: AuthUser, @Param('userId',ParseUUIDPipe) userId: string) {
    return this.admin.removeMember(actor,userId);
  }

  @Get('platform')
  platform(@CurrentUser() actor: AuthUser) { return this.admin.platform(actor); }
}
