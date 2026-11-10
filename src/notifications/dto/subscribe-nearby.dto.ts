import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class SubscribeNearbyDto {
  @ApiProperty({ description: '푸시 알림 디바이스 토큰', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  device_token: string;

  @ApiProperty({ example: 37.1234567 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ example: 127.1234567 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiPropertyOptional({ description: '알림 반경 (m)', default: 500 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50000)
  radius_m: number = 500;
}
