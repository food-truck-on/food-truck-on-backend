import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { CustomerModule } from './customer/customer.module.js';
import { DatabaseModule } from './database/database.module.js';
import { FoodTrucksModule } from './food-trucks/food-trucks.module.js';
import { LocationsModule } from './locations/locations.module.js';
import { MenusModule } from './menus/menus.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { SessionsModule } from './sessions/sessions.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    FoodTrucksModule,
    LocationsModule,
    MenusModule,
    SessionsModule,
    CustomerModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
