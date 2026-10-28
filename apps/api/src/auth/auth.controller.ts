    import { Body, Controller, HttpCode, Post } from '@nestjs/common';
    import { AuthService } from './auth.service.js';
    import { LoginDto, SignupDto } from './dto.js';

    @Controller('auth')
    export class AuthController {
      constructor(private readonly auth: AuthService) {}

      @Post('signup')
      signup(@Body() dto: SignupDto) {
        return this.auth.signup(dto);
      }

      @Post('login')
      @HttpCode(200)
      login(@Body() dto: LoginDto) {
        return this.auth.login(dto);
      }
    }