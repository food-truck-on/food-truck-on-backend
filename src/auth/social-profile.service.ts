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

const KAKAO_AUTHORIZE_URL = 'https://kauth.kakao.com/oauth/authorize';
const KAKAO_TOKEN_URL = 'https://kauth.kakao.com/oauth/token';
const KAKAO_USER_URL = 'https://kapi.kakao.com/v2/user/me';
const GOOGLE_AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USER_URL = 'https://openidconnect.googleapis.com/v1/userinfo';

/**
 * 소셜 제공자(OAuth 2.0 Authorization Code) 연동.
 * 서버가 제공자 로그인 페이지로 보내고, 콜백으로 받은 인가 코드를 직접 토큰으로 교환해 프로필을 가져온다.
 */
@Injectable()
export class SocialProfileService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  /** 제공자 로그인(동의) 페이지 URL */
  getAuthorizeUrl(provider: SocialProvider, state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.getClientId(provider),
      redirect_uri: this.getCallbackUrl(provider),
      state,
    });
    if (provider === SocialProvider.GOOGLE) {
      params.set('scope', 'openid profile');
    }
    const base =
      provider === SocialProvider.KAKAO
        ? KAKAO_AUTHORIZE_URL
        : GOOGLE_AUTHORIZE_URL;
    return `${base}?${params.toString()}`;
  }

  /** 제공자 인가 코드를 토큰으로 교환하고 프로필을 가져온다. */
  async getProfileByCode(
    provider: SocialProvider,
    code: string,
  ): Promise<SocialProfile> {
    try {
      const accessToken = await this.exchangeCode(provider, code);
      return provider === SocialProvider.KAKAO
        ? await this.getKakaoProfile(accessToken)
        : await this.getGoogleProfile(accessToken);
    } catch {
      throw new UnauthorizedException('소셜 로그인 인증에 실패했습니다.');
    }
  }

  private async exchangeCode(
    provider: SocialProvider,
    code: string,
  ): Promise<string> {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.getClientId(provider),
      redirect_uri: this.getCallbackUrl(provider),
      code,
    });
    const clientSecret = this.configService.get<string>(
      provider === SocialProvider.KAKAO
        ? 'KAKAO_CLIENT_SECRET'
        : 'GOOGLE_CLIENT_SECRET',
    );
    if (clientSecret) {
      body.set('client_secret', clientSecret);
    }

    const { data } = await firstValueFrom(
      this.httpService.post(
        provider === SocialProvider.KAKAO ? KAKAO_TOKEN_URL : GOOGLE_TOKEN_URL,
        body.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
          },
        },
      ),
    );
    if (!data?.access_token) {
      throw new Error('No access_token from provider');
    }
    return data.access_token;
  }

  private async getKakaoProfile(accessToken: string): Promise<SocialProfile> {
    const { data } = await firstValueFrom(
      this.httpService.get(KAKAO_USER_URL, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
    );
    return {
      providerId: String(data.id),
      nickname:
        data.kakao_account?.profile?.nickname ??
        data.properties?.nickname ??
        DEFAULT_NICKNAME,
    };
  }

  private async getGoogleProfile(accessToken: string): Promise<SocialProfile> {
    const { data } = await firstValueFrom(
      this.httpService.get(GOOGLE_USER_URL, {
        headers: { Authorization: `Bearer ${accessToken}` },
      }),
    );
    return {
      providerId: String(data.sub),
      nickname: data.name ?? DEFAULT_NICKNAME,
    };
  }

  private getClientId(provider: SocialProvider): string {
    return this.configService.getOrThrow<string>(
      provider === SocialProvider.KAKAO
        ? 'KAKAO_REST_API_KEY'
        : 'GOOGLE_CLIENT_ID',
    );
  }

  /** 제공자 콘솔에 등록하는 Redirect URI (이 서버의 콜백 엔드포인트) */
  private getCallbackUrl(provider: SocialProvider): string {
    const baseUrl = (
      this.configService.get<string>('API_BASE_URL') ??
      `http://localhost:${this.configService.get('PORT') ?? 3000}`
    ).replace(/\/+$/, '');
    return `${baseUrl}/api/v1/auth/${provider}/callback`;
  }
}
