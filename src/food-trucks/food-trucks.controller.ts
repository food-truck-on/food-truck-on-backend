import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { User } from '../users/entities/user.entity.js';
import { CreateFoodTruckDto } from './dto/create-food-truck.dto.js';
import { FoodTrucksService } from './food-trucks.service.js';
import { ErrorResponseDto } from '../common/dto/error-response.dto.js';
import {
  FoodTruckResponseDto,
  MyFoodTruckResponseDto,
} from './dto/food-truck-response.dto.js';

@ApiTags('푸드트럭 (FoodTruck)')
@Controller('food-trucks')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: '인증 토큰 없음 또는 만료',
  type: ErrorResponseDto,
})
@UseGuards(JwtAuthGuard)
export class FoodTrucksController {
  constructor(private readonly foodTrucksService: FoodTrucksService) {}

  @ApiOperation({ summary: '내 푸드트럭 조회. 등록된 푸드트럭이 없으면 404' })
  @ApiOkResponse({ type: MyFoodTruckResponseDto })
  @Get('me')
  getMine(@CurrentUser() user: User): Promise<MyFoodTruckResponseDto> {
    return this.foodTrucksService.getMine(user.id);
  }

  @ApiOperation({ summary: '푸드트럭 등록. 이미 등록한 푸드트럭이 있으면 409' })
  @ApiCreatedResponse({ type: FoodTruckResponseDto })
  @Post()
  create(
    @CurrentUser() user: User,
    @Body() dto: CreateFoodTruckDto,
  ): Promise<FoodTruckResponseDto> {
    return this.foodTrucksService.create(user.id, dto);
  }
}
