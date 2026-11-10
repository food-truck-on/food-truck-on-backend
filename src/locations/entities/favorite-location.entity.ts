import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { decimalTransformer } from '../../common/transformers/decimal.transformer.js';
import { FoodTruck } from '../../food-trucks/entities/food-truck.entity.js';

@Entity('favorite_locations')
export class FavoriteLocation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'food_truck_id', type: 'int' })
  foodTruckId: number;

  @ManyToOne(() => FoodTruck, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'food_truck_id' })
  foodTruck: Relation<FoodTruck>;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  address: string;

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

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
