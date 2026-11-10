import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { MenuItem } from '../menus/entities/menu-item.entity.js';
import { DailySession } from '../sessions/entities/daily-session.entity.js';
import { FoodTruck } from './entities/food-truck.entity.js';
import { FoodTrucksController } from './food-trucks.controller.js';
import { FoodTrucksService } from './food-trucks.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([FoodTruck, DailySession, MenuItem]),
    AuthModule,
  ],
  controllers: [FoodTrucksController],
  providers: [FoodTrucksService],
  exports: [FoodTrucksService],
})
export class FoodTrucksModule {}
