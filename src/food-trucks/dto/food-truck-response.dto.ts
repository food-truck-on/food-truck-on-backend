import { ApiProperty } from '@nestjs/swagger';
import { SessionStatus } from '../../sessions/entities/daily-session.entity.js';

export class FoodTruckResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: '타코야끼 달인' })
  name: string;

  @ApiProperty({
    description: '손님에게 공유하는 URL',
    example: 'https://오늘어디서팔아요.kr/타코야끼-달인-3fa9c1',
  })
  share_url: string;
}

export class TodaySessionSummaryDto {
  @ApiProperty({ enum: SessionStatus, example: SessionStatus.PREPARING })
  status: SessionStatus;

  @ApiProperty({
    type: String,
    nullable: true,
    example: '행복아파트 정문 앞',
  })
  location_label: string | null;

  @ApiProperty({ description: '오늘 판매하는(활성화된) 메뉴 수', example: 3 })
  menu_count: number;
}

export class MyFoodTruckResponseDto extends FoodTruckResponseDto {
  @ApiProperty({
    type: TodaySessionSummaryDto,
    nullable: true,
    description: '오늘(KST) 영업 세션 요약. 아직 세션이 없으면 null',
  })
  today_session: TodaySessionSummaryDto | null;
}
