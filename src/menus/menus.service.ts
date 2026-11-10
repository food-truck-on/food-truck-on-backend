import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { kstDate } from '../common/utils/kst.js';
import { FoodTrucksService } from '../food-trucks/food-trucks.service.js';
import { CreateMenuDto } from './dto/create-menu.dto.js';
import { UpdateMenuDto } from './dto/update-menu.dto.js';
import { MenuItem } from './entities/menu-item.entity.js';

@Injectable()
export class MenusService {
  constructor(
    @InjectRepository(MenuItem)
    private readonly menuItemRepository: Repository<MenuItem>,
    private readonly foodTrucksService: FoodTrucksService,
  ) {}

  async findAll(foodTruckId: number, userId: number) {
    await this.foodTrucksService.getOwned(foodTruckId, userId);
    await this.resetExpiredSoldOut(foodTruckId);
    const menus = await this.menuItemRepository.find({
      where: { foodTruckId },
      order: { id: 'ASC' },
    });
    return menus.map((menu) => this.toResponse(menu));
  }

  async create(foodTruckId: number, userId: number, dto: CreateMenuDto) {
    await this.foodTrucksService.getOwned(foodTruckId, userId);
    const menu = await this.menuItemRepository.save(
      this.menuItemRepository.create({
        foodTruckId,
        name: dto.name,
        price: dto.price,
        isSoldOut: false,
        soldOutDate: null,
        isActive: true,
      }),
    );
    return this.toResponse(menu);
  }

  async update(
    foodTruckId: number,
    menuId: number,
    userId: number,
    dto: UpdateMenuDto,
  ) {
    const menu = await this.getOwnedMenu(foodTruckId, menuId, userId);
    menu.name = dto.name ?? menu.name;
    menu.price = dto.price ?? menu.price;
    menu.isActive = dto.is_active ?? menu.isActive;
    return this.toResponse(await this.menuItemRepository.save(menu));
  }

  async remove(
    foodTruckId: number,
    menuId: number,
    userId: number,
  ): Promise<void> {
    const menu = await this.getOwnedMenu(foodTruckId, menuId, userId);
    await this.menuItemRepository.remove(menu);
  }

  async toggleSoldOut(foodTruckId: number, menuId: number, userId: number) {
    const menu = await this.getOwnedMenu(foodTruckId, menuId, userId);
    menu.isSoldOut = !menu.isSoldOut;
    menu.soldOutDate = menu.isSoldOut ? kstDate() : null;
    await this.menuItemRepository.save(menu);
    return {
      id: menu.id,
      name: menu.name,
      is_sold_out: menu.isSoldOut,
      sold_out_date: menu.soldOutDate,
    };
  }

  /** 오늘 판매 대상인(활성화된) 메뉴 목록. 품절 상태는 오늘 기준으로 정리된 값이다. */
  async findActive(foodTruckId: number): Promise<MenuItem[]> {
    await this.resetExpiredSoldOut(foodTruckId);
    return this.menuItemRepository.find({
      where: { foodTruckId, isActive: true },
      order: { id: 'ASC' },
    });
  }

  /** 활성 메뉴 구성을 주어진 메뉴들로 교체한다. (어제 메뉴 불러오기) */
  async replaceActive(foodTruckId: number, menuIds: number[]): Promise<void> {
    await this.menuItemRepository.manager.transaction(async (manager) => {
      await manager.update(
        MenuItem,
        { foodTruckId, isActive: true },
        { isActive: false },
      );
      await manager.update(
        MenuItem,
        { foodTruckId, id: In(menuIds) },
        { isActive: true },
      );
    });
  }

  /** 품절 자동 해제(lazy reset): sold_out_date 가 오늘(KST)이 아닌 품절 메뉴를 초기화한다. */
  private async resetExpiredSoldOut(foodTruckId: number): Promise<void> {
    await this.menuItemRepository.update(
      { foodTruckId, isSoldOut: true, soldOutDate: Not(kstDate()) },
      { isSoldOut: false, soldOutDate: null },
    );
  }

  private async getOwnedMenu(
    foodTruckId: number,
    menuId: number,
    userId: number,
  ): Promise<MenuItem> {
    await this.foodTrucksService.getOwned(foodTruckId, userId);
    await this.resetExpiredSoldOut(foodTruckId);
    const menu = await this.menuItemRepository.findOne({
      where: { id: menuId, foodTruckId },
    });
    if (!menu) {
      throw new NotFoundException('메뉴를 찾을 수 없습니다.');
    }
    return menu;
  }

  private toResponse(menu: MenuItem) {
    return {
      id: menu.id,
      name: menu.name,
      price: menu.price,
      is_sold_out: menu.isSoldOut,
      sold_out_date: menu.soldOutDate,
      is_active: menu.isActive,
    };
  }
}
