import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { distanceMeters } from '../common/utils/geo.js';
import { FoodTruck } from '../food-trucks/entities/food-truck.entity.js';
import { DailySession } from '../sessions/entities/daily-session.entity.js';
import { SubscribeNearbyDto } from './dto/subscribe-nearby.dto.js';
import { SubscribeDto } from './dto/subscribe.dto.js';
import { NearbyNotificationSubscription } from './entities/nearby-notification-subscription.entity.js';
import { NotificationSubscription } from './entities/notification-subscription.entity.js';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(NotificationSubscription)
    private readonly subscriptionRepository: Repository<NotificationSubscription>,
    @InjectRepository(NearbyNotificationSubscription)
    private readonly nearbySubscriptionRepository: Repository<NearbyNotificationSubscription>,
    @InjectRepository(FoodTruck)
    private readonly foodTruckRepository: Repository<FoodTruck>,
  ) {}

  /** 같은 기기가 다시 구독해도 중복 생성하지 않는다. */
  async subscribe(foodTruckId: number, dto: SubscribeDto) {
    const exists = await this.foodTruckRepository.exists({
      where: { id: foodTruckId },
    });
    if (!exists) {
      throw new NotFoundException('푸드트럭을 찾을 수 없습니다.');
    }

    await this.subscriptionRepository.upsert(
      { foodTruckId, deviceToken: dto.device_token },
      ['foodTruckId', 'deviceToken'],
    );
    return { food_truck_id: foodTruckId, subscribed: true };
  }

  /** 기기당 주변 알림 구독은 1개만 유지하고, 다시 요청하면 위치·반경을 갱신한다. */
  async subscribeNearby(dto: SubscribeNearbyDto) {
    await this.nearbySubscriptionRepository.upsert(
      {
        deviceToken: dto.device_token,
        latitude: dto.latitude,
        longitude: dto.longitude,
        radiusM: dto.radius_m,
      },
      ['deviceToken'],
    );
    return { subscribed: true };
  }

  /**
   * 오픈 알림 대상(트럭 구독자 + 반경 내 주변 구독자)의 디바이스 토큰을 모은다.
   * 실제 푸시 발송(FCM 등)은 명세에 없어 연동되어 있지 않으며, 여기에 연결하면 된다.
   */
  async notifyOpened(session: DailySession): Promise<void> {
    const subscriptions = await this.subscriptionRepository.find({
      where: { foodTruckId: session.foodTruckId },
    });
    const deviceTokens = new Set(subscriptions.map((s) => s.deviceToken));

    if (session.latitude !== null && session.longitude !== null) {
      const nearbySubscriptions =
        await this.nearbySubscriptionRepository.find();
      for (const nearby of nearbySubscriptions) {
        const distance = distanceMeters(
          nearby.latitude,
          nearby.longitude,
          session.latitude,
          session.longitude,
        );
        if (distance <= nearby.radiusM) {
          deviceTokens.add(nearby.deviceToken);
        }
      }
    }

    this.logger.log(
      `푸드트럭 ${session.foodTruckId} 오픈 알림 대상: ${deviceTokens.size}건`,
    );
  }
}
