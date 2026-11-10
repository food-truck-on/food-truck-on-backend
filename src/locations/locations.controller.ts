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
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { User } from '../users/entities/user.entity.js';
import { CreateLocationDto } from './dto/create-location.dto.js';
import { LocationsService } from './locations.service.js';
import { ErrorResponseDto } from '../common/dto/error-response.dto.js';
import { LocationResponseDto } from './dto/location-response.dto.js';

@ApiTags('위치 (Location)')
@Controller('food-trucks/:foodTruckId/locations')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: '인증 토큰 없음 또는 만료',
  type: ErrorResponseDto,
})
@UseGuards(JwtAuthGuard)
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @ApiOperation({ summary: '자주 가는 장소 목록 조회' })
  @ApiOkResponse({ type: [LocationResponseDto] })
  @Get()
  findAll(
    @Param('foodTruckId', ParseIntPipe) foodTruckId: number,
    @CurrentUser() user: User,
  ): Promise<LocationResponseDto[]> {
    return this.locationsService.findAll(foodTruckId, user.id);
  }

  @ApiOperation({ summary: '자주 가는 장소 추가' })
  @ApiCreatedResponse({ type: LocationResponseDto })
  @Post()
  create(
    @Param('foodTruckId', ParseIntPipe) foodTruckId: number,
    @CurrentUser() user: User,
    @Body() dto: CreateLocationDto,
  ): Promise<LocationResponseDto> {
    return this.locationsService.create(foodTruckId, user.id, dto);
  }

  @ApiOperation({ summary: '자주 가는 장소 삭제' })
  @ApiNoContentResponse()
  @Delete(':locationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('foodTruckId', ParseIntPipe) foodTruckId: number,
    @Param('locationId', ParseIntPipe) locationId: number,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.locationsService.remove(foodTruckId, locationId, user.id);
  }
}
