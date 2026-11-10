import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { FoodTruck } from '../../food-trucks/entities/food-truck.entity.js';

export enum SocialProvider {
  KAKAO = 'kakao',
  GOOGLE = 'google',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'simple-enum', enum: SocialProvider })
  provider: SocialProvider;

  @Column({ name: 'provider_id', type: 'varchar', length: 255, unique: true })
  providerId: string;

  @Column({ type: 'varchar', length: 100 })
  nickname: string;

  @Column({
    name: 'refresh_token_hash',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  refreshTokenHash: string | null;

  @Column({
    name: 'access_token',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  accessToken: string | null;

  @Column({ name: 'refresh_token_expires_at', type: Date, nullable: true })
  refreshTokenExpiresAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;

  @OneToMany(() => FoodTruck, (foodTruck) => foodTruck.owner)
  foodTrucks: Relation<FoodTruck[]>;
}
