import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { MenuItem } from '../../menus/entities/menu-item.entity.js';
import { DailySession } from './daily-session.entity.js';

/** 영업 세션에 포함된 메뉴의 오픈 시점 스냅샷 */
@Entity('session_menus')
export class SessionMenu {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'session_id', type: 'int' })
  sessionId: number;

  @ManyToOne(() => DailySession, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session: Relation<DailySession>;

  @Column({ name: 'menu_item_id', type: 'int' })
  menuItemId: number;

  @ManyToOne(() => MenuItem, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'menu_item_id' })
  menuItem: Relation<MenuItem>;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'int' })
  price: number;

  @Column({ name: 'is_sold_out', type: 'boolean', default: false })
  isSoldOut: boolean;
}
