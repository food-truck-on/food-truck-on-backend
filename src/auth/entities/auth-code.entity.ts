import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { User } from '../../users/entities/user.entity.js';

/**
 * 소셜 로그인 콜백 후 프론트엔드에 `?code=` 로 넘기는 1회용 인증 코드.
 * 토큰을 URL 에 노출하지 않기 위해, 프론트엔드는 이 코드를 POST /auth/token 으로 교환한다.
 */
@Entity('auth_codes')
export class AuthCode {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;

  /** 코드 원문은 저장하지 않고 SHA-256 해시만 저장한다. */
  @Column({ name: 'code_hash', type: 'varchar', length: 64, unique: true })
  codeHash: string;

  @Column({ name: 'is_new_user', type: 'boolean', default: false })
  isNewUser: boolean;

  @Column({ name: 'expires_at', type: Date })
  expiresAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
