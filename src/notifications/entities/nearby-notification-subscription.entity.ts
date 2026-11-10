import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { decimalTransformer } from '../../common/transformers/decimal.transformer.js';

/**
 * 주변 트럭 오픈 알림 구독 (API 7-2).
 * ERD 의 NotificationSubscription 은 food_truck_id 가 필수라 위치 기반 구독을 담을 수 없어 별도 테이블로 둔다.
 */
@Entity('nearby_notification_subscriptions')
export class NearbyNotificationSubscription {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'device_token', type: 'varchar', length: 255, unique: true })
  deviceToken: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 7,
    transformer: decimalTransformer,
  })
  latitude: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 7,
    transformer: decimalTransformer,
  })
  longitude: number;

  @Column({ name: 'radius_m', type: 'int', default: 500 })
  radiusM: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
