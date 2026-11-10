import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { User } from '../users/entities/user.entity.js';
import { CreateMenuDto } from './dto/create-menu.dto.js';
import { UpdateMenuDto } from './dto/update-menu.dto.js';
import { MenusService } from './menus.service.js';
import { ErrorResponseDto } from '../common/dto/error-response.dto.js';
import {
  MenuResponseDto,
  MenuSoldOutResponseDto,
} from './dto/menu-response.dto.js';

@ApiTags('메뉴 (Menu)')
@Controller('food-trucks/:foodTruckId/menus')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: '인증 토큰 없음 또는 만료',
  type: ErrorResponseDto,
})
@UseGuards(JwtAuthGuard)
export class MenusController {
  constructor(private readonly menusService: MenusService) {}

  @ApiOperation({ summary: '메뉴 목록 조회' })
  @ApiOkResponse({ type: [MenuResponseDto] })
  @Get()
  findAll(
    @Param('foodTruckId', ParseIntPipe) foodTruckId: number,
    @CurrentUser() user: User,
  ): Promise<MenuResponseDto[]> {
    return this.menusService.findAll(foodTruckId, user.id);
  }

  @ApiOperation({ summary: '메뉴 추가' })
  @ApiCreatedResponse({ type: MenuResponseDto })
  @Post()
  create(
    @Param('foodTruckId', ParseIntPipe) foodTruckId: number,
    @CurrentUser() user: User,
    @Body() dto: CreateMenuDto,
  ): Promise<MenuResponseDto> {
    return this.menusService.create(foodTruckId, user.id, dto);
  }

  @ApiOperation({
    summary:
      '메뉴 수정 (이름 / 가격 / 활성화 여부). 품절 변경은 품절 토글 API 를 사용한다.',
  })
  @ApiOkResponse({ type: MenuResponseDto })
  @Patch(':menuId')
  update(
    @Param('foodTruckId', ParseIntPipe) foodTruckId: number,
    @Param('menuId', ParseIntPipe) menuId: number,
    @CurrentUser() user: User,
    @Body() dto: UpdateMenuDto,
  ): Promise<MenuResponseDto> {
    return this.menusService.update(foodTruckId, menuId, user.id, dto);
  }

  @ApiOperation({ summary: '메뉴 삭제' })
  @ApiNoContentResponse()
  @Delete(':menuId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('foodTruckId', ParseIntPipe) foodTruckId: number,
    @Param('menuId', ParseIntPipe) menuId: number,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.menusService.remove(foodTruckId, menuId, user.id);
  }

  @ApiOperation({ summary: '메뉴 품절 토글. 품절은 당일(KST)까지만 유지된다.' })
  @ApiOkResponse({ type: MenuSoldOutResponseDto })
  @Patch(':menuId/sold-out')
  toggleSoldOut(
    @Param('foodTruckId', ParseIntPipe) foodTruckId: number,
    @Param('menuId', ParseIntPipe) menuId: number,
    @CurrentUser() user: User,
  ): Promise<MenuSoldOutResponseDto> {
    return this.menusService.toggleSoldOut(foodTruckId, menuId, user.id);
  }
}
