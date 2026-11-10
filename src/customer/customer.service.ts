import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { boundingBox, distanceMeters } from '../common/utils/geo.js';
import { kstDate, toHourMinute } from '../common/utils/kst.js';
import { FoodTruck } from '../food-trucks/entities/food-truck.entity.js';
import { MenusService } from '../menus/menus.service.js';
import {
  DailySession,
  SessionStatus,
} from '../sessions/entities/daily-session.entity.js';
import { DetailQueryDto } from './dto/detail-query.dto.js';
import { NearbyQueryDto } from './dto/nearby-query.dto.js';

@Injectable()
export class CustomerService {
  constructor(
    @InjectRepository(FoodTruck)
    private readonly foodTruckRepository: Repository<FoodTruck>,
    @InjectRepository(DailySession)
    private readonly sessionRepository: Repository<DailySession>,
    private readonly menusService: MenusService,
  ) {}

  /** 오늘(KST) 세션에 위치가 설정된 푸드트럭 중 반경 내의 트럭을 가까운 순으로 반환한다. */
  async findNearby(query: NearbyQueryDto) {
    const box = boundingBox(query.lat, query.lng, query.radius);
    const sessions = await this.sessionRepository.find({
      where: {
        date: kstDate(),
        latitude: Between(box.minLat, box.maxLat),
        longitude: Between(box.minLng, box.maxLng),
      },
      relations: { foodTruck: true },
    });

    const foodTrucks = sessions
      .map((session) =>
        this.toResponse(
          session.foodTruck,
          session,
          this.getDistance(session, query.lat, query.lng),
        ),
      )
      .filter((foodTruck) => foodTruck.distance_m! <= query.radius)
      .sort((a, b) => a.distance_m! - b.distance_m!);

    return {
      total: foodTrucks.length,
      open_count: foodTrucks.filter(
        (foodTruck) => foodTruck.status === SessionStatus.OPEN,
      ).length,
      food_trucks: foodTrucks,
    };
  }

  async findByShareSlug(shareSlug: string, query: DetailQueryDto) {
    const foodTruck = await this.foodTruckRepository.findOne({
      where: { shareSlug },
    });
    if (!foodTruck) {
      throw new NotFoundException('푸드트럭을 찾을 수 없습니다.');
    }

    const session = await this.sessionRepository.findOne({
      where: { foodTruckId: foodTruck.id, date: kstDate() },
    });
    const menus = await this.menusService.findActive(foodTruck.id);

    return {
      ...this.toResponse(
        foodTruck,
        session,
        this.getDistance(session, query.lat, query.lng),
      ),
      menus: menus.map((menu) => ({
        id: menu.id,
        name: menu.name,
        price: menu.price,
        is_sold_out: menu.isSoldOut,
      })),
    };
  }

  private getDistance(
    session: DailySession | null,
    lat?: number,
    lng?: number,
  ): number | null {
    if (
      !session ||
      session.latitude === null ||
      session.longitude === null ||
      lat === undefined ||
      lng === undefined
    ) {
      return null;
    }
    return distanceMeters(lat, lng, session.latitude, session.longitude);
  }

  /** 오늘 세션이 없는 트럭은 영업하지 않는 것으로 보고 closed 로 내려준다. */
  private toResponse(
    foodTruck: FoodTruck,
    session: DailySession | null,
    distanceM: number | null,
  ) {
    return {
      id: foodTruck.id,
      name: foodTruck.name,
      status: session?.status ?? SessionStatus.CLOSED,
      location_label: session?.locationLabel ?? null,
      open_time: toHourMinute(session?.openTime),
      close_time: toHourMinute(session?.closeTime),
      distance_m: distanceM,
      latitude: session?.latitude ?? null,
      longitude: session?.longitude ?? null,
    };
  }
}
