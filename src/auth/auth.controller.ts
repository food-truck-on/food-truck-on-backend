import {
  ApiBearerAuth,
  ApiFoundResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Redirect,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { User } from '../users/entities/user.entity.js';
import { AuthService } from './auth.service.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import {
  ExchangeCodeDto,
  SocialCallbackQueryDto,
  SocialProviderParamDto,
} from './dto/social-login.dto.js';
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
    summary: '소셜 로그인 시작 (kakao / google)',
    description:
      '브라우저를 이 주소로 이동시키면 소셜 제공자 로그인 페이지로 302 리다이렉트된다.',
  })
  @ApiFoundResponse({ description: '소셜 제공자 로그인 페이지로 리다이렉트' })
  @Get(':provider')
  @Redirect()
  async startSocialLogin(@Param() { provider }: SocialProviderParamDto) {
    return { url: await this.authService.getSocialLoginUrl(provider) };
  }

  @ApiOperation({
    summary: '소셜 로그인 콜백 (소셜 제공자가 호출)',
    description:
      '로그인 처리 후 프론트엔드(FRONTEND_LOGIN_REDIRECT_URL)로 `?code=` 를 붙여 302 리다이렉트한다. ' +
      '실패하면 `?error=` 를 붙인다. 가입되지 않은 사용자는 자동 가입된다.',
  })
  @ApiFoundResponse({
    description: '프론트엔드로 리다이렉트 (?code= / ?error=)',
  })
  @Get(':provider/callback')
  @Redirect()
  async socialCallback(
    @Param() { provider }: SocialProviderParamDto,
    @Query() query: SocialCallbackQueryDto,
  ) {
    return {
      url: await this.authService.handleSocialCallback(provider, query),
    };
  }

  @ApiOperation({
    summary: '로그인 code 교환. 콜백으로 받은 1회용 code 로 토큰을 발급받는다.',
  })
  @ApiOkResponse({ type: SocialLoginResponseDto })
  @ApiUnauthorizedResponse({
    description: 'code 가 유효하지 않거나 만료·사용됨',
    type: ErrorResponseDto,
  })
  @Post('token')
  @HttpCode(HttpStatus.OK)
  exchangeCode(@Body() dto: ExchangeCodeDto): Promise<SocialLoginResponseDto> {
    return this.authService.exchangeAuthCode(dto);
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
