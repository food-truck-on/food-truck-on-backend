import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { FoodTrucksModule } from '../food-trucks/food-trucks.module.js';
import { FavoriteLocation } from '../locations/entities/favorite-location.entity.js';
import { MenusModule } from '../menus/menus.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { DailySession } from './entities/daily-session.entity.js';
import { SessionMenu } from './entities/session-menu.entity.js';
import { SessionsController } from './sessions.controller.js';
import { SessionsService } from './sessions.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([DailySession, SessionMenu, FavoriteLocation]),
    AuthModule,
    FoodTrucksModule,
    MenusModule,
    NotificationsModule,
  ],
  controllers: [SessionsController],
  providers: [SessionsService],
})
export class SessionsModule {}
