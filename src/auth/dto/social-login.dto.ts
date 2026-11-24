import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { SocialProvider } from '../../users/entities/user.entity.js';

export class SocialProviderParamDto {
  @ApiProperty({ enum: SocialProvider, example: SocialProvider.KAKAO })
  @IsEnum(SocialProvider)
  provider: SocialProvider;
}

/** 소셜 제공자가 콜백으로 붙여 주는 쿼리 */
export class SocialCallbackQueryDto {
  @ApiPropertyOptional({ description: '소셜 제공자가 발급한 인가 코드' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ description: '로그인 시작 시 서버가 발급한 state' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({
    description: '사용자가 동의를 거부하는 등 실패 시 제공자가 붙이는 값',
  })
  @IsOptional()
  @IsString()
  error?: string;
}

export class ExchangeCodeDto {
  @ApiProperty({
    description: '로그인 콜백에서 프론트엔드로 전달된 1회용 code (`?code=`)',
  })
  @IsString()
  @IsNotEmpty()
  code: string;
}
