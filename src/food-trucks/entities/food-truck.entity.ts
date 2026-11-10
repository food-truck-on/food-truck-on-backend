import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { User } from '../../users/entities/user.entity.js';

@Entity('food_trucks')
export class FoodTruck {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'owner_id', type: 'int' })
  ownerId: number;

  @ManyToOne(() => User, (user) => user.foodTrucks, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'owner_id' })
  owner: Relation<User>;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  /** 공유 URL 의 slug 부분만 저장한다 (예: tk-달인-오늘). 전체 URL 은 응답 시 조립. */
  @Column({ name: 'share_url', type: 'varchar', length: 255, unique: true })
  shareSlug: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
