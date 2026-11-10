import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { SocialProfileService } from './social-profile.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    JwtModule.register({}),
    HttpModule.register({ timeout: 5000 }),
  ],
  controllers: [AuthController],
  providers: [AuthService, SocialProfileService, JwtAuthGuard],
  // JwtAuthGuard 를 쓰는 모듈은 AuthModule 을 import 해 AuthService 를 주입받는다.
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}
