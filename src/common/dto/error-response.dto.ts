import { ApiProperty } from '@nestjs/swagger';

export class ErrorDetailDto {
  @ApiProperty({ example: 'UNAUTHORIZED' })
  code: string;

  @ApiProperty({ example: '인증이 필요합니다.' })
  message: string;
}

/** 공통 에러 응답 형식 */
export class ErrorResponseDto {
  @ApiProperty({ type: ErrorDetailDto })
  error: ErrorDetailDto;
}
