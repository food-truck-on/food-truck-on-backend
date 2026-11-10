import { ApiProperty } from '@nestjs/swagger';

export class MenuResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: '타코야끼 8알' })
  name: string;

  @ApiProperty({ description: '가격 (원)', example: 5000 })
  price: number;

  @ApiProperty({
    description:
      '품절 여부. 당일(KST)에만 유지되고 날짜가 바뀌면 자동 해제된다.',
    example: false,
  })
  is_sold_out: boolean;

  @ApiProperty({
    type: String,
    nullable: true,
    description: '품절 처리된 날짜 (YYYY-MM-DD). 품절이 아니면 null',
    example: null,
  })
  sold_out_date: string | null;

  @ApiProperty({ description: '활성화(오늘 판매) 여부', example: true })
  is_active: boolean;
}

export class MenuSoldOutResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: '타코야끼 8알' })
  name: string;

  @ApiProperty({ example: true })
  is_sold_out: boolean;

  @ApiProperty({
    type: String,
    nullable: true,
    description: '품절 처리된 날짜 (YYYY-MM-DD). 해제된 경우 null',
    example: '2026-09-09',
  })
  sold_out_date: string | null;
}

/** 세션·손님 화면에서 쓰는 간략한 메뉴 정보 */
export class MenuSummaryDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: '타코야끼 8알' })
  name: string;

  @ApiProperty({ example: 5000 })
  price: number;

  @ApiProperty({ example: false })
  is_sold_out: boolean;
}
