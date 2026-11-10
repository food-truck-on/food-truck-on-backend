import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FoodTruck } from '../food-trucks/entities/food-truck.entity.js';
import { NearbyNotificationSubscription } from './entities/nearby-notification-subscription.entity.js';
import { NotificationSubscription } from './entities/notification-subscription.entity.js';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsService } from './notifications.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      NotificationSubscription,
      NearbyNotificationSubscription,
      FoodTruck,
    ]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
