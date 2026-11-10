import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { FoodTruck } from '../../food-trucks/entities/food-truck.entity.js';

@Entity('notification_subscriptions')
@Index(['foodTruckId', 'deviceToken'], { unique: true })
export class NotificationSubscription {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'food_truck_id', type: 'int' })
  foodTruckId: number;

  @ManyToOne(() => FoodTruck, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'food_truck_id' })
  foodTruck: Relation<FoodTruck>;

  @Column({ name: 'device_token', type: 'varchar', length: 255 })
  deviceToken: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
