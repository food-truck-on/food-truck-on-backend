import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SubscribeDto {
  @ApiProperty({ description: '푸시 알림 디바이스 토큰', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  device_token: string;
}
