import { randomBytes } from 'node:crypto';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { kstDate } from '../common/utils/kst.js';
import { MenuItem } from '../menus/entities/menu-item.entity.js';
import { DailySession } from '../sessions/entities/daily-session.entity.js';
import { CreateFoodTruckDto } from './dto/create-food-truck.dto.js';
import { FoodTruck } from './entities/food-truck.entity.js';

const DEFAULT_SHARE_BASE_URL = 'https://오늘어디서팔아요.kr';

@Injectable()
export class FoodTrucksService {
  constructor(
    @InjectRepository(FoodTruck)
    private readonly foodTruckRepository: Repository<FoodTruck>,
    @InjectRepository(DailySession)
    private readonly sessionRepository: Repository<DailySession>,
    @InjectRepository(MenuItem)
    private readonly menuItemRepository: Repository<MenuItem>,
    private readonly configService: ConfigService,
  ) {}

  async getMine(userId: number) {
    const foodTruck = await this.foodTruckRepository.findOne({
      where: { ownerId: userId },
    });
    if (!foodTruck) {
      throw new NotFoundException('등록된 푸드트럭이 없습니다.');
    }

    const session = await this.sessionRepository.findOne({
      where: { foodTruckId: foodTruck.id, date: kstDate() },
    });
    const menuCount = await this.menuItemRepository.count({
      where: { foodTruckId: foodTruck.id, isActive: true },
    });

    return {
      ...this.toResponse(foodTruck),
      today_session: session && {
        status: session.status,
        location_label: session.locationLabel,
        menu_count: menuCount,
      },
    };
  }

  async create(userId: number, dto: CreateFoodTruckDto) {
    const exists = await this.foodTruckRepository.exists({
      where: { ownerId: userId },
    });
    if (exists) {
      throw new ConflictException('이미 등록된 푸드트럭이 있습니다.');
    }

    const foodTruck = await this.foodTruckRepository.save(
      this.foodTruckRepository.create({
        ownerId: userId,
        name: dto.name,
        shareSlug: this.generateShareSlug(dto.name),
      }),
    );
    return this.toResponse(foodTruck);
  }

  /** 푸드트럭을 조회하고 소유자인지 확인한다. 없으면 404, 소유자가 아니면 403. */
  async getOwned(foodTruckId: number, userId: number): Promise<FoodTruck> {
    const foodTruck = await this.foodTruckRepository.findOne({
      where: { id: foodTruckId },
    });
    if (!foodTruck) {
      throw new NotFoundException('푸드트럭을 찾을 수 없습니다.');
    }
    this.assertOwner(foodTruck, userId);
    return foodTruck;
  }

  assertOwner(foodTruck: FoodTruck, userId: number): void {
    if (foodTruck.ownerId !== userId) {
      throw new ForbiddenException('해당 푸드트럭에 대한 권한이 없습니다.');
    }
  }

  toShareUrl(foodTruck: FoodTruck): string {
    const baseUrl =
      this.configService.get<string>('SHARE_BASE_URL') ??
      DEFAULT_SHARE_BASE_URL;
    return `${baseUrl}/${foodTruck.shareSlug}`;
  }

  private toResponse(foodTruck: FoodTruck) {
    return {
      id: foodTruck.id,
      name: foodTruck.name,
      share_url: this.toShareUrl(foodTruck),
    };
  }

  /** 이름 기반 slug 에 랜덤 접미사를 붙여 유일성을 확보한다. (예: 타코야끼-달인-3fa9c1) */
  private generateShareSlug(name: string): string {
    const base = name
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '');
    const suffix = randomBytes(3).toString('hex');
    return base ? `${base}-${suffix}` : suffix;
  }
}
