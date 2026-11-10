import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FoodTrucksService } from '../food-trucks/food-trucks.service.js';
import { CreateLocationDto } from './dto/create-location.dto.js';
import { FavoriteLocation } from './entities/favorite-location.entity.js';

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(FavoriteLocation)
    private readonly locationRepository: Repository<FavoriteLocation>,
    private readonly foodTrucksService: FoodTrucksService,
  ) {}

  async findAll(foodTruckId: number, userId: number) {
    await this.foodTrucksService.getOwned(foodTruckId, userId);
    const locations = await this.locationRepository.find({
      where: { foodTruckId },
      order: { id: 'ASC' },
    });
    return locations.map((location) => this.toResponse(location));
  }

  async create(foodTruckId: number, userId: number, dto: CreateLocationDto) {
    await this.foodTrucksService.getOwned(foodTruckId, userId);
    const location = await this.locationRepository.save(
      this.locationRepository.create({
        foodTruckId,
        name: dto.name,
        address: dto.address,
        latitude: dto.latitude,
        longitude: dto.longitude,
      }),
    );
    return this.toResponse(location);
  }

  async remove(
    foodTruckId: number,
    locationId: number,
    userId: number,
  ): Promise<void> {
    await this.foodTrucksService.getOwned(foodTruckId, userId);
    const result = await this.locationRepository.delete({
      id: locationId,
      foodTruckId,
    });
    if (!result.affected) {
      throw new NotFoundException('장소를 찾을 수 없습니다.');
    }
  }

  private toResponse(location: FavoriteLocation) {
    return {
      id: location.id,
      name: location.name,
      address: location.address,
      latitude: location.latitude,
      longitude: location.longitude,
    };
  }
}
