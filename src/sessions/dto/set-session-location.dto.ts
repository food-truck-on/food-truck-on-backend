import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** location_id(자주 가는 장소)만 보내면 해당 장소의 좌표·주소로 채워진다. */
export class SetSessionLocationDto {
  @ApiPropertyOptional({
    description: '자주 가는 장소 ID. 좌표·라벨을 생략하면 이 장소의 값을 쓴다.',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  location_id?: number;

  @ApiPropertyOptional({ example: 37.1234567 })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({ example: 127.1234567 })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({ example: '행복아파트 정문 앞', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  location_label?: string;
}
