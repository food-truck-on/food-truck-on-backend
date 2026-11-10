import { HttpService } from '@nestjs/axios';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { SocialProvider } from '../users/entities/user.entity.js';

export interface SocialProfile {
  providerId: string;
  nickname: string;
}

const DEFAULT_NICKNAME = '사용자';

/** 클라이언트가 전달한 소셜 토큰(provider_token)을 각 제공자 API 로 검증하고 프로필을 가져온다. */
@Injectable()
export class SocialProfileService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async getProfile(
    provider: SocialProvider,
    providerToken: string,
  ): Promise<SocialProfile> {
    try {
      return provider === SocialProvider.KAKAO
        ? await this.getKakaoProfile(providerToken)
        : await this.getGoogleProfile(providerToken);
    } catch {
      throw new UnauthorizedException('소셜 로그인 인증에 실패했습니다.');
    }
  }

  private async getKakaoProfile(accessToken: string): Promise<SocialProfile> {
    const headers = { Authorization: `Bearer ${accessToken}` };

    // 다른 앱에서 발급된 토큰으로 로그인하는 것을 막는다.
    const appId = this.configService.get<string>('KAKAO_APP_ID');
    if (appId) {
      const { data: tokenInfo } = await firstValueFrom(
        this.httpService.get(
          'https://kapi.kakao.com/v1/user/access_token_info',
          { headers },
        ),
      );
      if (String(tokenInfo.app_id) !== appId) {
        throw new Error('Kakao app id mismatch');
      }
    }

    const { data } = await firstValueFrom(
      this.httpService.get('https://kapi.kakao.com/v2/user/me', { headers }),
    );
    return {
      providerId: String(data.id),
      nickname:
        data.kakao_account?.profile?.nickname ??
        data.properties?.nickname ??
        DEFAULT_NICKNAME,
    };
  }

  /** id_token(JWT) 과 access_token 을 모두 지원한다. */
  private async getGoogleProfile(token: string): Promise<SocialProfile> {
    const isIdToken = token.split('.').length === 3;
    const { data: tokenInfo } = await firstValueFrom(
      this.httpService.get('https://oauth2.googleapis.com/tokeninfo', {
        params: isIdToken ? { id_token: token } : { access_token: token },
      }),
    );

    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    if (clientId && tokenInfo.aud !== clientId) {
      throw new Error('Google client id mismatch');
    }

    let nickname: string | undefined = tokenInfo.name;
    if (!isIdToken) {
      const { data: userInfo } = await firstValueFrom(
        this.httpService.get('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      );
      nickname = userInfo.name;
    }

    return {
      providerId: String(tokenInfo.sub),
      nickname: nickname ?? DEFAULT_NICKNAME,
    };
  }
}
