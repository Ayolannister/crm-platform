    import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
    import { AuthGuard } from '../auth/auth.guard.js';
    import { CurrentUser } from '../auth/current-user.decorator.js';
    import type { AuthUser } from '../auth/current-user.decorator.js';
    import { ContactsService } from './contacts.service.js';
    import { CreateContactDto } from './dto.js';

    @Controller('contacts')
    @UseGuards(AuthGuard)
    export class ContactsController {
      constructor(private readonly contacts: ContactsService) {}

      @Get()
      list(@CurrentUser() user: AuthUser) {
        return this.contacts.list(user.orgId);
      }

      @Post()
      create(@CurrentUser() user: AuthUser, @Body() dto: CreateContactDto) {
        return this.contacts.create(user.orgId, dto);
      }
    }