    import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { IsUUID } from 'class-validator';
import { AuthGuard } from './auth.guard.js';
import { CurrentUser } from './current-user.decorator.js';
import type { AuthUser } from './current-user.decorator.js';

class SwitchOrgDto { @IsUUID() orgId!: string; }
    import { AuthService } from './auth.service.js';
    import { LoginDto, SignupDto } from './dto.js';

    @Controller('auth')
    export class AuthController {
      constructor(private readonly auth: AuthService) {}

      @Post('signup')
      signup(@Body() dto: SignupDto) {
        return this.auth.signup(dto);
      }

      @Get('organizations')
      @UseGuards(AuthGuard)
      organizations(@CurrentUser() user: AuthUser) {
        return this.auth.organizationsForUser(user.userId);
      }

      @Post('switch')
      @UseGuards(AuthGuard)
      @HttpCode(200)
      switch(@CurrentUser() user: AuthUser, @Body() dto: SwitchOrgDto) {
        return this.auth.switchOrganization(user.userId, dto.orgId);
      }

      @Post('login')
      @HttpCode(200)
      login(@Body() dto: LoginDto) {
        return this.auth.login(dto);
      }
    }