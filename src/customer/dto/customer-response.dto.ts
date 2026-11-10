import { ApiProperty } from '@nestjs/swagger';
import { MenuSummaryDto } from '../../menus/dto/menu-response.dto.js';
import { SessionStatus } from '../../sessions/entities/daily-session.entity.js';

export class CustomerFoodTruckDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: '타코야끼 달인' })
  name: string;

  @ApiProperty({
    enum: SessionStatus,
    description: '오늘 영업 상태. 오늘 세션이 없으면 closed',
    example: SessionStatus.OPEN,
  })
  status: SessionStatus;

  @ApiProperty({
    type: String,
    nullable: true,
    example: '행복아파트 정문 앞',
  })
  location_label: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: '오픈 시각 (KST, HH:mm). 아직 오픈 전이면 null',
    example: '16:00',
  })
  open_time: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: '마감 시각 (KST, HH:mm). 영업 종료 전이면 null',
    example: '21:00',
  })
  close_time: string | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description:
      '요청 위치로부터의 거리 (m). 위치를 보내지 않았거나 트럭 위치가 없으면 null',
    example: 120,
  })
  distance_m: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 37.1234567 })
  latitude: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 127.1234567 })
  longitude: number | null;
}

export class NearbyFoodTrucksResponseDto {
  @ApiProperty({ description: '반경 내 푸드트럭 수', example: 4 })
  total: number;

  @ApiProperty({ description: '그중 영업 중(open)인 수', example: 2 })
  open_count: number;

  @ApiProperty({
    type: [CustomerFoodTruckDto],
    description: '가까운 순으로 정렬',
  })
  food_trucks: CustomerFoodTruckDto[];
}

export class CustomerFoodTruckDetailDto extends CustomerFoodTruckDto {
  @ApiProperty({ type: [MenuSummaryDto] })
  menus: MenuSummaryDto[];
}
