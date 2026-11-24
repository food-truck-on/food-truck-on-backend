import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { SocialProvider, User } from '../users/entities/user.entity.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import {
  ExchangeCodeDto,
  SocialCallbackQueryDto,
} from './dto/social-login.dto.js';
import { AuthCode } from './entities/auth-code.entity.js';
import {
  SocialProfile,
  SocialProfileService,
} from './social-profile.service.js';

type TokenType = 'access' | 'refresh';

interface TokenPayload {
  sub: number;
  type: TokenType;
  exp: number;
}

const DEFAULT_ACCESS_EXPIRES_IN_SEC = 60 * 60;
const DEFAULT_REFRESH_EXPIRES_IN_SEC = 14 * 24 * 60 * 60;
/** 프론트엔드에 `?code=` 로 넘기는 1회용 코드의 유효 시간 */
const AUTH_CODE_EXPIRES_IN_SEC = 3 * 60;
/** 소셜 로그인 시작~콜백 사이 CSRF 방지용 state 의 유효 시간 */
const OAUTH_STATE_EXPIRES_IN_SEC = 10 * 60;
const OAUTH_STATE_TYPE = 'oauth_state';
const DEFAULT_FRONTEND_LOGIN_REDIRECT_URL =
  'http://localhost:3000/auth/callback';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(AuthCode)
    private readonly authCodeRepository: Repository<AuthCode>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly socialProfileService: SocialProfileService,
  ) {}

  /** 소셜 로그인 시작: 제공자 로그인 페이지 URL (state 포함) */
  async getSocialLoginUrl(provider: SocialProvider): Promise<string> {
    const state = await this.jwtService.signAsync(
      { type: OAUTH_STATE_TYPE, provider, jti: randomUUID() },
      {
        secret: this.getSecret('access'),
        expiresIn: OAUTH_STATE_EXPIRES_IN_SEC,
      },
    );
    return this.socialProfileService.getAuthorizeUrl(provider, state);
  }

  /**
   * 소셜 제공자 콜백 처리 후 프론트엔드로 보낼 URL 을 반환한다.
   * 성공: `{FRONTEND_LOGIN_REDIRECT_URL}?code=<1회용 코드>`
   * 실패: `{FRONTEND_LOGIN_REDIRECT_URL}?error=<에러 코드>`
   */
  async handleSocialCallback(
    provider: SocialProvider,
    query: SocialCallbackQueryDto,
  ): Promise<string> {
    if (query.error || !query.code) {
      return this.buildFrontendRedirect({
        error: query.error ? 'access_denied' : 'invalid_request',
      });
    }
    if (!query.state || !(await this.isValidState(query.state, provider))) {
      return this.buildFrontendRedirect({ error: 'invalid_state' });
    }

    try {
      const profile = await this.socialProfileService.getProfileByCode(
        provider,
        query.code,
      );
      const { user, isNewUser } = await this.findOrCreateUser(
        provider,
        profile,
      );
      const code = await this.createAuthCode(user.id, isNewUser);
      return this.buildFrontendRedirect({ code });
    } catch {
      return this.buildFrontendRedirect({ error: 'login_failed' });
    }
  }

  /** 프론트엔드가 받은 1회용 code 를 토큰으로 교환한다. */
  async exchangeAuthCode(dto: ExchangeCodeDto) {
    const authCode = await this.authCodeRepository.findOne({
      where: { codeHash: this.hashToken(dto.code) },
      relations: { user: true },
    });
    // 1회용: 성공·실패와 관계없이 조회된 코드는 바로 폐기한다.
    if (authCode) {
      await this.authCodeRepository.delete(authCode.id);
    }
    if (
      !authCode ||
      !authCode.user ||
      authCode.expiresAt.getTime() <= Date.now()
    ) {
      throw new UnauthorizedException(
        'code 가 유효하지 않거나 만료되었습니다.',
      );
    }

    const tokens = await this.issueTokens(authCode.userId);
    return {
      ...tokens,
      user: { id: authCode.user.id, nickname: authCode.user.nickname },
      is_new_user: authCode.isNewUser,
    };
  }

  async refresh(dto: RefreshTokenDto) {
    const payload = await this.verifyToken(dto.refresh_token, 'refresh');
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });

    if (
      !user ||
      !user.refreshTokenExpiresAt ||
      user.refreshTokenExpiresAt.getTime() <= Date.now() ||
      user.refreshTokenHash !== this.hashToken(dto.refresh_token)
    ) {
      throw new UnauthorizedException(
        'refresh_token 이 유효하지 않거나 만료되었습니다.',
      );
    }

    return this.issueTokens(user.id);
  }

  async logout(userId: number): Promise<void> {
    await this.userRepository.update(userId, {
      accessToken: null,
      refreshTokenHash: null,
      refreshTokenExpiresAt: null,
    });
  }

  /** access_token 을 검증하고 사용자를 반환한다. (JwtAuthGuard 에서 사용) */
  async authenticate(accessToken: string): Promise<User> {
    const payload = await this.verifyToken(accessToken, 'access');
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });

    // 로그아웃·재발급·다른 기기 로그인으로 교체된 토큰은 만료 전이라도 거부한다.
    if (!user || user.accessToken !== accessToken) {
      throw new UnauthorizedException('인증 토큰이 유효하지 않습니다.');
    }
    return user;
  }

  private async findOrCreateUser(
    provider: SocialProvider,
    profile: SocialProfile,
  ): Promise<{ user: User; isNewUser: boolean }> {
    const user = await this.userRepository.findOne({
      where: { provider, providerId: profile.providerId },
      withDeleted: true,
    });

    if (!user) {
      const created = await this.userRepository.save(
        this.userRepository.create({
          provider,
          providerId: profile.providerId,
          nickname: profile.nickname,
        }),
      );
      return { user: created, isNewUser: true };
    }
    if (user.deletedAt) {
      // 탈퇴한 사용자가 다시 로그인하면 신규 가입으로 취급해 계정을 되살린다.
      await this.userRepository.restore(user.id);
      await this.userRepository.update(user.id, { nickname: profile.nickname });
      user.nickname = profile.nickname;
      user.deletedAt = null;
      return { user, isNewUser: true };
    }
    return { user, isNewUser: false };
  }

  /** 1회용 코드를 만들고 해시만 저장한다. 유저당 유효한 코드는 1개. */
  private async createAuthCode(
    userId: number,
    isNewUser: boolean,
  ): Promise<string> {
    const code = randomBytes(32).toString('base64url');
    await this.authCodeRepository.delete({ userId });
    await this.authCodeRepository.delete({ expiresAt: LessThan(new Date()) });
    await this.authCodeRepository.save(
      this.authCodeRepository.create({
        userId,
        codeHash: this.hashToken(code),
        isNewUser,
        expiresAt: new Date(Date.now() + AUTH_CODE_EXPIRES_IN_SEC * 1000),
      }),
    );
    return code;
  }

  private async isValidState(
    state: string,
    provider: SocialProvider,
  ): Promise<boolean> {
    try {
      const payload = await this.jwtService.verifyAsync<{
        type: string;
        provider: string;
      }>(state, { secret: this.getSecret('access') });
      return payload.type === OAUTH_STATE_TYPE && payload.provider === provider;
    } catch {
      return false;
    }
  }

  private buildFrontendRedirect(params: Record<string, string>): string {
    const url = new URL(
      this.configService.get<string>('FRONTEND_LOGIN_REDIRECT_URL') ??
        DEFAULT_FRONTEND_LOGIN_REDIRECT_URL,
    );
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    return url.toString();
  }

  /** 토큰 쌍을 발급하고 User 레코드에 저장한다 (유저당 1개, rotation). */
  private async issueTokens(userId: number) {
    const accessToken = await this.jwtService.signAsync(
      { sub: userId, type: 'access' satisfies TokenType, jti: randomUUID() },
      {
        secret: this.getSecret('access'),
        expiresIn: this.getExpiresInSec('access'),
      },
    );
    const refreshToken = await this.jwtService.signAsync(
      { sub: userId, type: 'refresh' satisfies TokenType, jti: randomUUID() },
      {
        secret: this.getSecret('refresh'),
        expiresIn: this.getExpiresInSec('refresh'),
      },
    );

    await this.userRepository.update(userId, {
      accessToken,
      refreshTokenHash: this.hashToken(refreshToken),
      refreshTokenExpiresAt: new Date(
        Date.now() + this.getExpiresInSec('refresh') * 1000,
      ),
    });

    return { access_token: accessToken, refresh_token: refreshToken };
  }

  private async verifyToken(
    token: string,
    type: TokenType,
  ): Promise<TokenPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<TokenPayload>(token, {
        secret: this.getSecret(type),
      });
      if (payload.type !== type) {
        throw new Error('Token type mismatch');
      }
      return payload;
    } catch {
      throw new UnauthorizedException('토큰이 유효하지 않거나 만료되었습니다.');
    }
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private getSecret(type: TokenType): string {
    return this.configService.getOrThrow<string>(
      type === 'access' ? 'JWT_ACCESS_SECRET' : 'JWT_REFRESH_SECRET',
    );
  }

  private getExpiresInSec(type: TokenType): number {
    return type === 'access'
      ? Number(
          this.configService.get('JWT_ACCESS_EXPIRES_IN_SEC') ??
            DEFAULT_ACCESS_EXPIRES_IN_SEC,
        )
      : Number(
          this.configService.get('JWT_REFRESH_EXPIRES_IN_SEC') ??
            DEFAULT_REFRESH_EXPIRES_IN_SEC,
        );
  }
}
