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
import { FoodTruck } from '../../food-trucks/entities/food-truck.entity.js';

@Entity('menu_items')
export class MenuItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'food_truck_id', type: 'int' })
  foodTruckId: number;

  @ManyToOne(() => FoodTruck, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'food_truck_id' })
  foodTruck: Relation<FoodTruck>;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'int' })
  price: number;

  @Column({ name: 'is_sold_out', type: 'boolean', default: false })
  isSoldOut: boolean;

  /** 품절 처리된 날짜(KST, YYYY-MM-DD). 오늘이 아니면 품절 아님으로 간주한다. */
  @Column({ name: 'sold_out_date', type: 'date', nullable: true })
  soldOutDate: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
