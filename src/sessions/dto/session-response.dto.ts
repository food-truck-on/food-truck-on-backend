import { ApiProperty } from '@nestjs/swagger';
import { MenuSummaryDto } from '../../menus/dto/menu-response.dto.js';
import { SessionStatus } from '../entities/daily-session.entity.js';

export class SessionMenuSummaryDto {
  @ApiProperty({ description: '대표 메뉴 ID', example: 1 })
  id: number;

  @ApiProperty({
    description: '대표 메뉴 이름 + "외 N개"',
    example: '타코야끼 8알 외 2개',
  })
  name: string;
}

export class TodaySessionResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ description: '영업 날짜 (KST)', example: '2026-09-08' })
  date: string;

  @ApiProperty({ enum: SessionStatus, example: SessionStatus.PREPARING })
  status: SessionStatus;

  @ApiProperty({
    type: String,
    nullable: true,
    example: '행복아파트 정문 앞',
  })
  location_label: string | null;

  @ApiProperty({ example: 3 })
  menu_count: number;

  @ApiProperty({
    type: [SessionMenuSummaryDto],
    description: '홈 화면 요약용. 메뉴가 없으면 빈 배열, 있으면 1건',
  })
  menus: SessionMenuSummaryDto[];
}

export class SessionLocationResponseDto {
  @ApiProperty({ example: 1 })
  session_id: number;

  @ApiProperty({
    type: String,
    nullable: true,
    example: '행복아파트 정문 앞',
  })
  location_label: string | null;

  @ApiProperty({ example: 37.1234567 })
  latitude: number;

  @ApiProperty({ example: 127.1234567 })
  longitude: number;
}

export class OpenSessionResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ enum: SessionStatus, example: SessionStatus.OPEN })
  status: SessionStatus;

  @ApiProperty({ example: '2026-09-05T07:00:00.000Z' })
  opened_at: Date;

  @ApiProperty({
    example: 'https://오늘어디서팔아요.kr/타코야끼-달인-3fa9c1',
  })
  share_url: string;
}

export class CloseSessionResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ enum: SessionStatus, example: SessionStatus.CLOSED })
  status: SessionStatus;
}

export class ImportMenusResponseDto {
  @ApiProperty({ example: 3 })
  imported_count: number;

  @ApiProperty({ type: [MenuSummaryDto] })
  menus: MenuSummaryDto[];
}
