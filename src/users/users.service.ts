import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { FoodTruck } from '../food-trucks/entities/food-truck.entity.js';
import { User } from './entities/user.entity.js';

@Injectable()
export class UsersService {
  constructor(private readonly dataSource: DataSource) {}

  /** 회원 탈퇴: soft delete + 토큰 무효화. 푸드트럭 삭제 시 세션·메뉴·장소·구독은 FK CASCADE 로 함께 삭제된다. */
  async withdraw(userId: number): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await manager.delete(FoodTruck, { ownerId: userId });
      await manager.update(User, userId, {
        accessToken: null,
        refreshTokenHash: null,
        refreshTokenExpiresAt: null,
      });
      await manager.softDelete(User, userId);
    });
  }
}
