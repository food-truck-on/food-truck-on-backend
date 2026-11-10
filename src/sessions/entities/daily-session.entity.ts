import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { decimalTransformer } from '../../common/transformers/decimal.transformer.js';
import { FoodTruck } from '../../food-trucks/entities/food-truck.entity.js';
import { FavoriteLocation } from '../../locations/entities/favorite-location.entity.js';

export enum SessionStatus {
  PREPARING = 'preparing',
  OPEN = 'open',
  CLOSED = 'closed',
}

@Entity('daily_sessions')
@Index(['foodTruckId', 'date'], { unique: true })
export class DailySession {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'food_truck_id', type: 'int' })
  foodTruckId: number;

  @ManyToOne(() => FoodTruck, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'food_truck_id' })
  foodTruck: Relation<FoodTruck>;

  /** 영업 날짜 (KST, YYYY-MM-DD) */
  @Column({ type: 'date' })
  date: string;

  @Column({
    type: 'simple-enum',
    enum: SessionStatus,
    default: SessionStatus.PREPARING,
  })
  status: SessionStatus;

  @Column({ name: 'location_id', type: 'int', nullable: true })
  locationId: number | null;

  @ManyToOne(() => FavoriteLocation, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'location_id' })
  location: Relation<FavoriteLocation> | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 7,
    nullable: true,
    transformer: decimalTransformer,
  })
  latitude: number | null;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 7,
    nullable: true,
    transformer: decimalTransformer,
  })
  longitude: number | null;

  @Column({
    name: 'location_label',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  locationLabel: string | null;

  @Column({ name: 'open_time', type: 'time', nullable: true })
  openTime: string | null;

  @Column({ name: 'close_time', type: 'time', nullable: true })
  closeTime: string | null;

  @Column({ name: 'opened_at', type: Date, nullable: true })
  openedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
