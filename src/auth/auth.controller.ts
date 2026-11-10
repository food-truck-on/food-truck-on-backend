import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { User } from '../users/entities/user.entity.js';
import { AuthService } from './auth.service.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { SocialLoginDto } from './dto/social-login.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { ErrorResponseDto } from '../common/dto/error-response.dto.js';
import {
  SocialLoginResponseDto,
  TokenResponseDto,
} from './dto/auth-response.dto.js';

@ApiTags('인증 (Auth)')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({
    summary:
      '소셜 로그인 (kakao / google). 가입되지 않은 사용자는 자동 가입된다.',
  })
  @ApiOkResponse({ type: SocialLoginResponseDto })
  @Post('social')
  @HttpCode(HttpStatus.OK)
  socialLogin(@Body() dto: SocialLoginDto): Promise<SocialLoginResponseDto> {
    return this.authService.socialLogin(dto);
  }

  @ApiOperation({
    summary: '토큰 재발급. 기존 refresh_token 은 무효화된다 (rotation).',
  })
  @ApiOkResponse({ type: TokenResponseDto })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshTokenDto): Promise<TokenResponseDto> {
    return this.authService.refresh(dto);
  }

  @ApiOperation({ summary: '로그아웃. 발급된 토큰을 모두 무효화한다.' })
  @ApiNoContentResponse()
  @Post('logout')
  @ApiBearerAuth()
  @ApiUnauthorizedResponse({
    description: '인증 토큰 없음 또는 만료',
    type: ErrorResponseDto,
  })
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@CurrentUser() user: User): Promise<void> {
    return this.authService.logout(user.id);
  }
}
