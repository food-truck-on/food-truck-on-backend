import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FoodTruck } from '../food-trucks/entities/food-truck.entity.js';
import { MenusModule } from '../menus/menus.module.js';
import { DailySession } from '../sessions/entities/daily-session.entity.js';
import { CustomerController } from './customer.controller.js';
import { CustomerService } from './customer.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([FoodTruck, DailySession]), MenusModule],
  controllers: [CustomerController],
  providers: [CustomerService],
})
export class CustomerModule {}
