import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';

/** 현재 위치를 함께 보내면 distance_m 을 계산해 내려준다. */
export class DetailQueryDto {
  @ApiPropertyOptional({
    description: '현재 위도. lng 와 함께 보내면 distance_m 이 계산된다.',
    example: 37.1234567,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @ApiPropertyOptional({ description: '현재 경도', example: 127.1234567 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;
}
