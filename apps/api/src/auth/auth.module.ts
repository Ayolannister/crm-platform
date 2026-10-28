    import { Module } from '@nestjs/common';
    import { JwtModule } from '@nestjs/jwt';
    import { requireEnv } from '../config.js';
    import { AuthController } from './auth.controller.js';
    import { AuthService } from './auth.service.js';

    @Module({
      imports: [
        JwtModule.registerAsync({
          global: true,
          useFactory: () => ({
            secret: requireEnv('JWT_SECRET'),
            signOptions: { expiresIn: 900 },
          }),
        }),
      ],
      controllers: [AuthController],
      providers: [AuthService],
    })
    export class AuthModule {}