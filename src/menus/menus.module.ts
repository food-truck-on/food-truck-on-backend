import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { FoodTrucksModule } from '../food-trucks/food-trucks.module.js';
import { MenuItem } from './entities/menu-item.entity.js';
import { MenusController } from './menus.controller.js';
import { MenusService } from './menus.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([MenuItem]), AuthModule, FoodTrucksModule],
  controllers: [MenusController],
  providers: [MenusService],
  exports: [MenusService],
})
export class MenusModule {}
