import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Controller, Get, Param, Query } from '@nestjs/common';
import { CustomerService } from './customer.service.js';
import { DetailQueryDto } from './dto/detail-query.dto.js';
import { NearbyQueryDto } from './dto/nearby-query.dto.js';
import {
  CustomerFoodTruckDetailDto,
  NearbyFoodTrucksResponseDto,
} from './dto/customer-response.dto.js';

@ApiTags('손님 화면 (Customer)')
@Controller('customer/food-trucks')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  // ':shareSlug' 보다 먼저 선언해야 'nearby' 가 slug 로 매칭되지 않는다.
  @ApiOperation({ summary: '내 주변 푸드트럭 목록 조회 (가까운 순)' })
  @ApiOkResponse({ type: NearbyFoodTrucksResponseDto })
  @Get('nearby')
  findNearby(
    @Query() query: NearbyQueryDto,
  ): Promise<NearbyFoodTrucksResponseDto> {
    return this.customerService.findNearby(query);
  }

  @ApiOperation({ summary: '푸드트럭 상세 조회 (공유 URL 의 slug 기반)' })
  @ApiOkResponse({ type: CustomerFoodTruckDetailDto })
  @Get(':shareSlug')
  findByShareSlug(
    @Param('shareSlug') shareSlug: string,
    @Query() query: DetailQueryDto,
  ): Promise<CustomerFoodTruckDetailDto> {
    return this.customerService.findByShareSlug(shareSlug, query);
  }
}
