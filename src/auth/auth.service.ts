import { createHash, randomUUID } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { SocialLoginDto } from './dto/social-login.dto.js';
import { SocialProfileService } from './social-profile.service.js';

type TokenType = 'access' | 'refresh';

interface TokenPayload {
  sub: number;
  type: TokenType;
  exp: number;
}

const DEFAULT_ACCESS_EXPIRES_IN_SEC = 60 * 60;
const DEFAULT_REFRESH_EXPIRES_IN_SEC = 14 * 24 * 60 * 60;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly socialProfileService: SocialProfileService,
  ) {}

  async socialLogin(dto: SocialLoginDto) {
    const profile = await this.socialProfileService.getProfile(
      dto.provider,
      dto.provider_token,
    );

    let user = await this.userRepository.findOne({
      where: { provider: dto.provider, providerId: profile.providerId },
      withDeleted: true,
    });
    let isNewUser = false;

    if (!user) {
      user = await this.userRepository.save(
        this.userRepository.create({
          provider: dto.provider,
          providerId: profile.providerId,
          nickname: profile.nickname,
        }),
      );
      isNewUser = true;
    } else if (user.deletedAt) {
      // 탈퇴한 사용자가 다시 로그인하면 신규 가입으로 취급해 계정을 되살린다.
      await this.userRepository.restore(user.id);
      await this.userRepository.update(user.id, { nickname: profile.nickname });
      user.nickname = profile.nickname;
      isNewUser = true;
    }

    const tokens = await this.issueTokens(user.id);
    return {
      ...tokens,
      user: { id: user.id, nickname: user.nickname },
      is_new_user: isNewUser,
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
