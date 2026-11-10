import { ApiProperty } from '@nestjs/swagger';

export class AuthUserDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: '타코야끼사장' })
  nickname: string;
}

export class TokenResponseDto {
  @ApiProperty({ description: 'API 호출용 토큰 (Authorization: Bearer)' })
  access_token: string;

  @ApiProperty({
    description: '토큰 재발급용 토큰. 재발급 시 새 값으로 교체된다.',
  })
  refresh_token: string;
}

export class SocialLoginResponseDto extends TokenResponseDto {
  @ApiProperty({ type: AuthUserDto })
  user: AuthUserDto;

  @ApiProperty({
    description: '이번 로그인으로 새로 가입되었는지 여부',
    example: true,
  })
  is_new_user: boolean;
}
