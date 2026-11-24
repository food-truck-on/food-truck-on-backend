import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, Like } from 'typeorm';
import { kstDate } from '../../common/utils/kst.js';
import { FoodTruck } from '../../food-trucks/entities/food-truck.entity.js';
import { MenuItem } from '../../menus/entities/menu-item.entity.js';
import {
  DailySession,
  SessionStatus,
} from '../../sessions/entities/daily-session.entity.js';
import { SessionMenu } from '../../sessions/entities/session-menu.entity.js';
import { SocialProvider, User } from '../../users/entities/user.entity.js';
import {
  SEED_CLOSE_TIME,
  SEED_OPEN_TIME,
  SEED_PROVIDER_ID_PREFIX,
  SEED_SHARE_SLUG_PREFIX,
  SEED_TRUCKS,
  SeedTruck,
} from './seed-data.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const METERS_PER_LAT_DEGREE = 111320;

export interface SeedCenter {
  lat: number;
  lng: number;
}

/** 가상 데이터를 넣고 지운다. 여러 번 실행해도 같은 트럭이 중복으로 생기지 않는다. */
@Injectable()
export class SeedService {
  constructor(private readonly dataSource: DataSource) {}

  /** 기준 좌표 주변에 가상 푸드트럭을 넣고, 오늘(KST)부터 days 일치 영업 세션을 만든다. */
  async run(center: SeedCenter, days: number) {
    const dates = Array.from({ length: days }, (_, index) =>
      kstDate(new Date(Date.now() + index * DAY_MS)),
    );

    await this.dataSource.transaction(async (manager) => {
      for (const truck of SEED_TRUCKS) {
        const foodTruck = await this.upsertFoodTruck(manager, truck);
        const menus = await this.upsertMenus(manager, foodTruck.id, truck);
        for (const date of dates) {
          await this.upsertSession(
            manager,
            foodTruck.id,
            truck,
            menus,
            date,
            center,
          );
        }
      }
    });

    return { truckCount: SEED_TRUCKS.length, dates };
  }

  /** 가상 사용자를 지운다. 트럭·메뉴·세션은 FK CASCADE 로 함께 지워진다. */
  async clear(): Promise<number> {
    const result = await this.dataSource
      .getRepository(User)
      .delete({ providerId: Like(`${SEED_PROVIDER_ID_PREFIX}%`) });
    return result.affected ?? 0;
  }

  private async upsertFoodTruck(
    manager: EntityManager,
    truck: SeedTruck,
  ): Promise<FoodTruck> {
    const providerId = `${SEED_PROVIDER_ID_PREFIX}owner-${truck.key}`;
    let user = await manager.findOne(User, {
      where: { providerId },
      withDeleted: true,
    });
    if (!user) {
      user = await manager.save(
        manager.create(User, {
          provider: SocialProvider.KAKAO,
          providerId,
          nickname: `${truck.name} 사장님`,
        }),
      );
    } else if (user.deletedAt) {
      await manager.restore(User, user.id);
    }

    const foodTruck =
      (await manager.findOne(FoodTruck, { where: { ownerId: user.id } })) ??
      manager.create(FoodTruck, { ownerId: user.id });
    foodTruck.name = truck.name;
    foodTruck.shareSlug = `${SEED_SHARE_SLUG_PREFIX}${truck.key}`;
    return manager.save(foodTruck);
  }

  private async upsertMenus(
    manager: EntityManager,
    foodTruckId: number,
    truck: SeedTruck,
  ): Promise<MenuItem[]> {
    const menus: MenuItem[] = [];
    for (const seedMenu of truck.menus) {
      const menu =
        (await manager.findOne(MenuItem, {
          where: { foodTruckId, name: seedMenu.name },
        })) ?? manager.create(MenuItem, { foodTruckId, name: seedMenu.name });
      menu.price = seedMenu.price;
      menu.isActive = true;
      menu.isSoldOut = seedMenu.soldOut ?? false;
      menu.soldOutDate = seedMenu.soldOut ? kstDate() : null;
      menus.push(await manager.save(menu));
    }
    return menus;
  }

  private async upsertSession(
    manager: EntityManager,
    foodTruckId: number,
    truck: SeedTruck,
    menus: MenuItem[],
    date: string,
    center: SeedCenter,
  ): Promise<void> {
    const session =
      (await manager.findOne(DailySession, {
        where: { foodTruckId, date },
      })) ?? manager.create(DailySession, { foodTruckId, date });

    const hasOpened = truck.status !== SessionStatus.PREPARING;
    session.status = truck.status;
    session.locationId = null;
    session.latitude = roundCoordinate(
      center.lat + truck.northM / METERS_PER_LAT_DEGREE,
    );
    session.longitude = roundCoordinate(
      center.lng +
        truck.eastM /
          (METERS_PER_LAT_DEGREE * Math.cos((center.lat * Math.PI) / 180)),
    );
    session.locationLabel = truck.locationLabel;
    session.openTime = hasOpened ? SEED_OPEN_TIME : null;
    session.closeTime =
      truck.status === SessionStatus.CLOSED ? SEED_CLOSE_TIME : null;
    session.openedAt = hasOpened
      ? new Date(`${date}T${SEED_OPEN_TIME}+09:00`)
      : null;
    const saved = await manager.save(session);

    // 실제 오픈 처리와 같게, 영업을 시작한 세션에만 메뉴 스냅샷을 남긴다.
    await manager.delete(SessionMenu, { sessionId: saved.id });
    if (hasOpened) {
      await manager.save(
        menus.map((menu) =>
          manager.create(SessionMenu, {
            sessionId: saved.id,
            menuItemId: menu.id,
            name: menu.name,
            price: menu.price,
            isSoldOut: menu.isSoldOut,
          }),
        ),
      );
    }
  }
}

/** 좌표 컬럼이 DECIMAL(10,7) 이라 소수 7자리로 맞춘다. */
function roundCoordinate(value: number): number {
  return Math.round(value * 1e7) / 1e7;
}
