import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Body, Controller, Param, ParseIntPipe, Post } from '@nestjs/common';
import { SubscribeNearbyDto } from './dto/subscribe-nearby.dto.js';
import { SubscribeDto } from './dto/subscribe.dto.js';
import { NotificationsService } from './notifications.service.js';
import {
  NearbySubscribeResponseDto,
  SubscribeResponseDto,
} from './dto/subscribe-response.dto.js';

@ApiTags('알림 (Notification)')
@Controller('customer')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @ApiOperation({ summary: '푸드트럭 오픈 알림 구독' })
  @ApiCreatedResponse({ type: SubscribeResponseDto })
  @Post('food-trucks/:foodTruckId/subscribe')
  subscribe(
    @Param('foodTruckId', ParseIntPipe) foodTruckId: number,
    @Body() dto: SubscribeDto,
  ): Promise<SubscribeResponseDto> {
    return this.notificationsService.subscribe(foodTruckId, dto);
  }

  @ApiOperation({
    summary:
      '주변 트럭 오픈 알림 구독. 기기당 1개만 유지되며 다시 요청하면 갱신된다.',
  })
  @ApiCreatedResponse({ type: NearbySubscribeResponseDto })
  @Post('notifications/nearby')
  subscribeNearby(
    @Body() dto: SubscribeNearbyDto,
  ): Promise<NearbySubscribeResponseDto> {
    return this.notificationsService.subscribeNearby(dto);
  }
}
