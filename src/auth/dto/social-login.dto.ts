import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { SocialProvider } from '../../users/entities/user.entity.js';

export class SocialLoginDto {
  @ApiProperty({ enum: SocialProvider, example: SocialProvider.KAKAO })
  @IsEnum(SocialProvider)
  provider: SocialProvider;

  @ApiProperty({
    description:
      '소셜 SDK 로 받은 토큰 (kakao: access_token, google: id_token 또는 access_token)',
  })
  @IsString()
  @IsNotEmpty()
  provider_token: string;
}
