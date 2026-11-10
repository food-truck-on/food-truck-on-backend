import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, LessThan, Repository } from 'typeorm';
import { kstDate, kstTime } from '../common/utils/kst.js';
import { FoodTrucksService } from '../food-trucks/food-trucks.service.js';
import { FavoriteLocation } from '../locations/entities/favorite-location.entity.js';
import { MenusService } from '../menus/menus.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { SetSessionLocationDto } from './dto/set-session-location.dto.js';
import {
  DailySession,
  SessionStatus,
} from './entities/daily-session.entity.js';
import { SessionMenu } from './entities/session-menu.entity.js';

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(
    @InjectRepository(DailySession)
    private readonly sessionRepository: Repository<DailySession>,
    @InjectRepository(SessionMenu)
    private readonly sessionMenuRepository: Repository<SessionMenu>,
    @InjectRepository(FavoriteLocation)
    private readonly locationRepository: Repository<FavoriteLocation>,
    private readonly dataSource: DataSource,
    private readonly foodTrucksService: FoodTrucksService,
    private readonly menusService: MenusService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /** 오늘(KST) 세션을 조회하고, 없으면 preparing 상태로 생성한다. */
  async getOrCreateToday(foodTruckId: number, userId: number) {
    await this.foodTrucksService.getOwned(foodTruckId, userId);

    const where = { foodTruckId, date: kstDate() };
    let session = await this.sessionRepository.findOne({ where });
    if (!session) {
      try {
        session = await this.sessionRepository.save(
          this.sessionRepository.create(where),
        );
      } catch (error) {
        // 동시 요청으로 이미 생성된 경우 (food_truck_id, date) 유니크 충돌 → 다시 조회
        session = await this.sessionRepository.findOne({ where });
        if (!session) {
          throw error;
        }
      }
    }

    const menus = await this.menusService.findActive(foodTruckId);
    return {
      id: session.id,
      date: session.date,
      status: session.status,
      location_label: session.locationLabel,
      menu_count: menus.length,
      // 홈 화면 요약용: 대표 메뉴 1건에 "외 N개" 를 붙여 내려준다.
      menus: menus.length
        ? [
            {
              id: menus[0].id,
              name:
                menus.length > 1
                  ? `${menus[0].name} 외 ${menus.length - 1}개`
                  : menus[0].name,
            },
          ]
        : [],
    };
  }

  async setLocation(
    sessionId: number,
    userId: number,
    dto: SetSessionLocationDto,
  ) {
    const session = await this.getOwnedSession(sessionId, userId);

    let favorite: FavoriteLocation | null = null;
    if (dto.location_id !== undefined) {
      favorite = await this.locationRepository.findOne({
        where: { id: dto.location_id, foodTruckId: session.foodTruckId },
      });
      if (!favorite) {
        throw new NotFoundException('장소를 찾을 수 없습니다.');
      }
    }

    const latitude = dto.latitude ?? favorite?.latitude;
    const longitude = dto.longitude ?? favorite?.longitude;
    if (latitude === undefined || longitude === undefined) {
      throw new BadRequestException(
        'location_id 또는 latitude/longitude 가 필요합니다.',
      );
    }

    session.locationId = favorite?.id ?? null;
    session.latitude = latitude;
    session.longitude = longitude;
    session.locationLabel = dto.location_label ?? favorite?.address ?? null;
    await this.sessionRepository.save(session);

    return {
      session_id: session.id,
      location_label: session.locationLabel,
      latitude,
      longitude,
    };
  }

  /** 오픈하기: 위치와 메뉴가 모두 설정된 오늘 세션만 가능. 오픈 시점의 메뉴를 스냅샷으로 남긴다. */
  async open(sessionId: number, userId: number) {
    const session = await this.getOwnedSession(sessionId, userId);
    this.assertToday(session);
    if (session.status === SessionStatus.OPEN) {
      throw new ConflictException('이미 영업 중입니다.');
    }
    if (session.latitude === null || session.longitude === null) {
      throw new BadRequestException('위치를 먼저 설정해주세요.');
    }
    const menus = await this.menusService.findActive(session.foodTruckId);
    if (menus.length === 0) {
      throw new BadRequestException('메뉴를 먼저 등록해주세요.');
    }

    const now = new Date();
    session.status = SessionStatus.OPEN;
    session.openedAt = now;
    session.openTime = kstTime(now);
    session.closeTime = null;

    await this.dataSource.transaction(async (manager) => {
      await manager.delete(SessionMenu, { sessionId: session.id });
      await manager.save(
        menus.map((menu) =>
          manager.create(SessionMenu, {
            sessionId: session.id,
            menuItemId: menu.id,
            name: menu.name,
            price: menu.price,
            isSoldOut: menu.isSoldOut,
          }),
        ),
      );
      await manager.save(session);
    });

    // 알림 실패가 오픈 처리를 막지 않도록 응답과 분리한다.
    this.notificationsService
      .notifyOpened(session)
      .catch((error) => this.logger.error(error));

    return {
      id: session.id,
      status: session.status,
      opened_at: now,
      share_url: this.foodTrucksService.toShareUrl(session.foodTruck),
    };
  }

  async close(sessionId: number, userId: number) {
    const session = await this.getOwnedSession(sessionId, userId);
    if (session.status !== SessionStatus.OPEN) {
      throw new ConflictException('영업 중인 세션이 아닙니다.');
    }

    session.status = SessionStatus.CLOSED;
    session.closeTime = kstTime();
    await this.sessionRepository.save(session);

    return { id: session.id, status: session.status };
  }

  /**
   * 어제 메뉴 불러오기: 가장 최근에 영업한 이전 세션의 메뉴 스냅샷과 같은 구성으로
   * 오늘의 활성 메뉴를 맞춘다. (그 사이 삭제된 메뉴는 제외)
   */
  async importYesterdayMenus(sessionId: number, userId: number) {
    const session = await this.getOwnedSession(sessionId, userId);
    this.assertToday(session);
    if (session.status !== SessionStatus.PREPARING) {
      throw new ConflictException(
        '영업 준비 중에만 메뉴를 불러올 수 있습니다.',
      );
    }

    const previousSession = await this.sessionRepository.findOne({
      where: {
        foodTruckId: session.foodTruckId,
        date: LessThan(session.date),
        status: In([SessionStatus.OPEN, SessionStatus.CLOSED]),
      },
      order: { date: 'DESC' },
    });
    const snapshots = previousSession
      ? await this.sessionMenuRepository.find({
          where: { sessionId: previousSession.id },
        })
      : [];
    if (snapshots.length === 0) {
      throw new NotFoundException('불러올 이전 영업 메뉴가 없습니다.');
    }

    await this.menusService.replaceActive(
      session.foodTruckId,
      snapshots.map((snapshot) => snapshot.menuItemId),
    );
    const menus = await this.menusService.findActive(session.foodTruckId);

    return {
      imported_count: menus.length,
      menus: menus.map((menu) => ({
        id: menu.id,
        name: menu.name,
        price: menu.price,
        is_sold_out: menu.isSoldOut,
      })),
    };
  }

  private async getOwnedSession(
    sessionId: number,
    userId: number,
  ): Promise<DailySession> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: { foodTruck: true },
    });
    if (!session) {
      throw new NotFoundException('영업 세션을 찾을 수 없습니다.');
    }
    this.foodTrucksService.assertOwner(session.foodTruck, userId);
    return session;
  }

  private assertToday(session: DailySession): void {
    if (session.date !== kstDate()) {
      throw new ConflictException('오늘의 영업 세션이 아닙니다.');
    }
  }
}
