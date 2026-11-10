import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module.js';
import { FoodTrucksModule } from '../food-trucks/food-trucks.module.js';
import { FavoriteLocation } from './entities/favorite-location.entity.js';
import { LocationsController } from './locations.controller.js';
import { LocationsService } from './locations.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([FavoriteLocation]),
    AuthModule,
    FoodTrucksModule,
  ],
  controllers: [LocationsController],
  providers: [LocationsService],
})
export class LocationsModule {}
