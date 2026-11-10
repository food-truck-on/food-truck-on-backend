import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from './../src/app.module.js';
import { setupApp } from './../src/app.setup.js';
import { SocialProfileService } from './../src/auth/social-profile.service.js';
import { kstDate } from './../src/common/utils/kst.js';
import { DatabaseModule } from './../src/database/database.module.js';
import { MenuItem } from './../src/menus/entities/menu-item.entity.js';
import {
  DailySession,
  SessionStatus,
} from './../src/sessions/entities/daily-session.entity.js';
import { SessionMenu } from './../src/sessions/entities/session-menu.entity.js';

// MySQL 없이 돌릴 수 있도록 인메모리 sql.js 로 DB 를 대체한다.
@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqljs',
      autoLoadEntities: true,
      synchronize: true,
    }),
  ],
})
class TestDatabaseModule {}

const yesterday = kstDate(new Date(Date.now() - 24 * 60 * 60 * 1000));

describe('Food truck API (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const api = () => request(app.getHttpServer());
  const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
  // 소셜 토큰 검증을 대체: provider_token 을 그대로 provider_id 로 쓴다.
  const login = async (providerToken: string) => {
    const response = await api()
      .post('/api/v1/auth/social')
      .send({ provider: 'kakao', provider_token: providerToken })
      .expect(200);
    return response.body;
  };

  beforeAll(async () => {
    process.env.JWT_ACCESS_SECRET = 'test-access-secret';
    process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideModule(DatabaseModule)
      .useModule(TestDatabaseModule)
      .overrideProvider(SocialProfileService)
      .useValue({
        getProfile: async (_provider: string, token: string) => ({
          providerId: token,
          nickname: `닉네임-${token}`,
        }),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    setupApp(app);
    await app.init();
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  it('헬스 체크', () => {
    return api().get('/api/v1').expect(200);
  });

  it('Swagger 문서를 제공한다', async () => {
    const response = await api().get('/api/docs-json').expect(200);
    expect(response.body.paths).toHaveProperty(
      '/api/v1/sessions/{sessionId}/open',
    );
    expect(
      response.body.paths['/api/v1/food-trucks/me'].get.security,
    ).toEqual([{ bearer: [] }]);
    await api().get('/api/docs').expect(200);
  });

  it('인증이 없으면 공통 에러 형식으로 401 을 반환한다', async () => {
    const response = await api().get('/api/v1/food-trucks/me').expect(401);
    expect(response.body).toEqual({
      error: { code: 'UNAUTHORIZED', message: '인증이 필요합니다.' },
    });
  });

  it('잘못된 요청은 400 을 반환한다', async () => {
    const response = await api()
      .post('/api/v1/auth/social')
      .send({ provider: 'naver', provider_token: 'x' })
      .expect(400);
    expect(response.body.error.code).toBe('BAD_REQUEST');
  });

  describe('인증', () => {
    it('소셜 로그인: 신규/기존 사용자를 구분하고, 재로그인 시 이전 토큰은 만료된다', async () => {
      const first = await login('auth-user');
      expect(first.is_new_user).toBe(true);
      expect(first.user.nickname).toBe('닉네임-auth-user');

      const second = await login('auth-user');
      expect(second.is_new_user).toBe(false);
      expect(second.user.id).toBe(first.user.id);

      await api()
        .post('/api/v1/food-trucks')
        .set(bearer(first.access_token))
        .send({ name: '만료 토큰 트럭' })
        .expect(401);
    });

    it('토큰 재발급은 rotation 되고, 로그아웃하면 모두 무효화된다', async () => {
      const { refresh_token } = await login('refresh-user');

      const refreshed = await api()
        .post('/api/v1/auth/refresh')
        .send({ refresh_token })
        .expect(200);
      expect(refreshed.body.refresh_token).not.toBe(refresh_token);

      // 이전 refresh_token 은 재사용 불가
      await api()
        .post('/api/v1/auth/refresh')
        .send({ refresh_token })
        .expect(401);

      await api()
        .post('/api/v1/auth/logout')
        .set(bearer(refreshed.body.access_token))
        .expect(204);
      await api()
        .get('/api/v1/food-trucks/me')
        .set(bearer(refreshed.body.access_token))
        .expect(401);
      await api()
        .post('/api/v1/auth/refresh')
        .send({ refresh_token: refreshed.body.refresh_token })
        .expect(401);
    });
  });

  describe('사장님 영업 흐름', () => {
    let token: string;
    let foodTruckId: number;
    let shareSlug: string;
    let locationId: number;
    let menuId: number;
    let sessionId: number;

    beforeAll(async () => {
      token = (await login('owner')).access_token;
    });

    it('푸드트럭 등록 / 중복 등록 409 / 내 푸드트럭 조회', async () => {
      await api()
        .get('/api/v1/food-trucks/me')
        .set(bearer(token))
        .expect(404);

      const created = await api()
        .post('/api/v1/food-trucks')
        .set(bearer(token))
        .send({ name: '타코야끼 달인' })
        .expect(201);
      foodTruckId = created.body.id;
      shareSlug = decodeURIComponent(
        created.body.share_url.split('/').pop() as string,
      );
      expect(created.body.name).toBe('타코야끼 달인');
      expect(shareSlug).toMatch(/^타코야끼-달인-[0-9a-f]{6}$/);

      await api()
        .post('/api/v1/food-trucks')
        .set(bearer(token))
        .send({ name: '두번째 트럭' })
        .expect(409);

      const mine = await api()
        .get('/api/v1/food-trucks/me')
        .set(bearer(token))
        .expect(200);
      expect(mine.body).toEqual({ ...created.body, today_session: null });
    });

    it('다른 사용자는 접근할 수 없다 (403)', async () => {
      const other = await login('intruder');
      await api()
        .get(`/api/v1/food-trucks/${foodTruckId}/menus`)
        .set(bearer(other.access_token))
        .expect(403);
      await api()
        .get('/api/v1/food-trucks/9999/menus')
        .set(bearer(other.access_token))
        .expect(404);
    });

    it('자주 가는 장소 추가 / 목록 / 삭제', async () => {
      const body = {
        name: '행복아파트 정문',
        address: '행복아파트 정문 앞',
        latitude: 37.1234567,
        longitude: 127.1234567,
      };
      const created = await api()
        .post(`/api/v1/food-trucks/${foodTruckId}/locations`)
        .set(bearer(token))
        .send(body)
        .expect(201);
      locationId = created.body.id;
      expect(created.body).toEqual({ id: locationId, ...body });

      const extra = await api()
        .post(`/api/v1/food-trucks/${foodTruckId}/locations`)
        .set(bearer(token))
        .send({ ...body, name: '삭제할 장소' })
        .expect(201);
      await api()
        .delete(`/api/v1/food-trucks/${foodTruckId}/locations/${extra.body.id}`)
        .set(bearer(token))
        .expect(204);

      const list = await api()
        .get(`/api/v1/food-trucks/${foodTruckId}/locations`)
        .set(bearer(token))
        .expect(200);
      expect(list.body).toEqual([{ id: locationId, ...body }]);
    });

    it('오늘 세션은 없으면 생성되고, 위치·메뉴 없이는 오픈할 수 없다', async () => {
      const session = await api()
        .get(`/api/v1/food-trucks/${foodTruckId}/sessions/today`)
        .set(bearer(token))
        .expect(200);
      sessionId = session.body.id;
      expect(session.body).toEqual({
        id: sessionId,
        date: kstDate(),
        status: 'preparing',
        location_label: null,
        menu_count: 0,
        menus: [],
      });

      const again = await api()
        .get(`/api/v1/food-trucks/${foodTruckId}/sessions/today`)
        .set(bearer(token))
        .expect(200);
      expect(again.body.id).toBe(sessionId);

      await api()
        .post(`/api/v1/sessions/${sessionId}/open`)
        .set(bearer(token))
        .expect(400);
    });

    it('세션 위치 설정 (자주 가는 장소 선택)', async () => {
      const response = await api()
        .patch(`/api/v1/sessions/${sessionId}/location`)
        .set(bearer(token))
        .send({ location_id: locationId })
        .expect(200);
      expect(response.body).toEqual({
        session_id: sessionId,
        location_label: '행복아파트 정문 앞',
        latitude: 37.1234567,
        longitude: 127.1234567,
      });

      // 위치만 있고 메뉴가 없으면 여전히 오픈 불가
      await api()
        .post(`/api/v1/sessions/${sessionId}/open`)
        .set(bearer(token))
        .expect(400);
    });

    it('메뉴 추가 / 수정 / 삭제 / 목록', async () => {
      const created = await api()
        .post(`/api/v1/food-trucks/${foodTruckId}/menus`)
        .set(bearer(token))
        .send({ name: '타코야끼 8알', price: 5000 })
        .expect(201);
      menuId = created.body.id;
      expect(created.body).toEqual({
        id: menuId,
        name: '타코야끼 8알',
        price: 5000,
        is_sold_out: false,
        sold_out_date: null,
        is_active: true,
      });

      const second = await api()
        .post(`/api/v1/food-trucks/${foodTruckId}/menus`)
        .set(bearer(token))
        .send({ name: '타코야끼 12알', price: 7000 })
        .expect(201);
      const third = await api()
        .post(`/api/v1/food-trucks/${foodTruckId}/menus`)
        .set(bearer(token))
        .send({ name: '삭제할 메뉴', price: 1000 })
        .expect(201);
      await api()
        .delete(`/api/v1/food-trucks/${foodTruckId}/menus/${third.body.id}`)
        .set(bearer(token))
        .expect(204);

      const updated = await api()
        .patch(`/api/v1/food-trucks/${foodTruckId}/menus/${menuId}`)
        .set(bearer(token))
        .send({ price: 5500 })
        .expect(200);
      expect(updated.body).toMatchObject({ name: '타코야끼 8알', price: 5500 });

      const list = await api()
        .get(`/api/v1/food-trucks/${foodTruckId}/menus`)
        .set(bearer(token))
        .expect(200);
      expect(list.body.map((menu: { id: number }) => menu.id)).toEqual([
        menuId,
        second.body.id,
      ]);
    });

    it('품절 토글: 당일만 유지되고 날짜가 바뀌면 자동 해제된다', async () => {
      const url = `/api/v1/food-trucks/${foodTruckId}/menus/${menuId}/sold-out`;

      const soldOut = await api().patch(url).set(bearer(token)).expect(200);
      expect(soldOut.body).toEqual({
        id: menuId,
        name: '타코야끼 8알',
        is_sold_out: true,
        sold_out_date: kstDate(),
      });

      // 어제 품절 처리된 것으로 조작 → 조회 시 자동 해제
      await dataSource
        .getRepository(MenuItem)
        .update(menuId, { soldOutDate: yesterday });
      const list = await api()
        .get(`/api/v1/food-trucks/${foodTruckId}/menus`)
        .set(bearer(token))
        .expect(200);
      expect(list.body[0]).toMatchObject({
        is_sold_out: false,
        sold_out_date: null,
      });

      // 해제된 상태에서 토글 → 품절, 다시 토글 → 해제
      await api().patch(url).set(bearer(token)).expect(200);
      const released = await api().patch(url).set(bearer(token)).expect(200);
      expect(released.body).toMatchObject({
        is_sold_out: false,
        sold_out_date: null,
      });
    });

    it('오픈하기', async () => {
      const today = await api()
        .get(`/api/v1/food-trucks/${foodTruckId}/sessions/today`)
        .set(bearer(token))
        .expect(200);
      expect(today.body).toMatchObject({
        menu_count: 2,
        menus: [{ id: menuId, name: '타코야끼 8알 외 1개' }],
      });

      const opened = await api()
        .post(`/api/v1/sessions/${sessionId}/open`)
        .set(bearer(token))
        .expect(200);
      expect(opened.body).toMatchObject({ id: sessionId, status: 'open' });
      expect(new Date(opened.body.opened_at).getTime()).not.toBeNaN();
      expect(decodeURIComponent(opened.body.share_url)).toContain(shareSlug);

      const snapshots = await dataSource
        .getRepository(SessionMenu)
        .findBy({ sessionId });
      expect(snapshots).toHaveLength(2);

      await api()
        .post(`/api/v1/sessions/${sessionId}/open`)
        .set(bearer(token))
        .expect(409);

      const mine = await api()
        .get('/api/v1/food-trucks/me')
        .set(bearer(token))
        .expect(200);
      expect(mine.body.today_session).toEqual({
        status: 'open',
        location_label: '행복아파트 정문 앞',
        menu_count: 2,
      });
    });

    it('손님: 내 주변 푸드트럭 조회', async () => {
      const nearby = await api()
        .get('/api/v1/customer/food-trucks/nearby')
        .query({ lat: 37.1234567, lng: 127.1244567 })
        .expect(200);
      expect(nearby.body.total).toBe(1);
      expect(nearby.body.open_count).toBe(1);
      expect(nearby.body.food_trucks[0]).toMatchObject({
        id: foodTruckId,
        name: '타코야끼 달인',
        status: 'open',
        location_label: '행복아파트 정문 앞',
        close_time: null,
        latitude: 37.1234567,
        longitude: 127.1234567,
      });
      expect(nearby.body.food_trucks[0].open_time).toMatch(/^\d{2}:\d{2}$/);
      // 경도 0.001도 ≈ 88m (위도 37도)
      expect(nearby.body.food_trucks[0].distance_m).toBeGreaterThan(80);
      expect(nearby.body.food_trucks[0].distance_m).toBeLessThan(100);

      const outOfRange = await api()
        .get('/api/v1/customer/food-trucks/nearby')
        .query({ lat: 37.1234567, lng: 127.1244567, radius: 50 })
        .expect(200);
      expect(outOfRange.body).toEqual({
        total: 0,
        open_count: 0,
        food_trucks: [],
      });

      await api().get('/api/v1/customer/food-trucks/nearby').expect(400);
    });

    it('손님: 공유 URL 로 상세 조회', async () => {
      const detail = await api()
        .get(`/api/v1/customer/food-trucks/${encodeURIComponent(shareSlug)}`)
        .expect(200);
      expect(detail.body).toMatchObject({
        id: foodTruckId,
        status: 'open',
        distance_m: null,
        menus: [
          { id: menuId, name: '타코야끼 8알', price: 5500, is_sold_out: false },
          { name: '타코야끼 12알', price: 7000, is_sold_out: false },
        ],
      });

      await api().get('/api/v1/customer/food-trucks/없는-트럭').expect(404);
    });

    it('손님: 알림 구독', async () => {
      const url = `/api/v1/customer/food-trucks/${foodTruckId}/subscribe`;
      const subscribed = await api()
        .post(url)
        .send({ device_token: 'device-1' })
        .expect(201);
      expect(subscribed.body).toEqual({
        food_truck_id: foodTruckId,
        subscribed: true,
      });
      // 같은 기기의 중복 구독도 성공 처리
      await api().post(url).send({ device_token: 'device-1' }).expect(201);
      await api()
        .post('/api/v1/customer/food-trucks/9999/subscribe')
        .send({ device_token: 'device-1' })
        .expect(404);

      const nearbyBody = {
        device_token: 'device-1',
        latitude: 37.1234567,
        longitude: 127.1234567,
        radius_m: 500,
      };
      const nearby = await api()
        .post('/api/v1/customer/notifications/nearby')
        .send(nearbyBody)
        .expect(201);
      expect(nearby.body).toEqual({ subscribed: true });
      await api()
        .post('/api/v1/customer/notifications/nearby')
        .send({ ...nearbyBody, radius_m: 1000 })
        .expect(201);
    });

    it('영업 종료', async () => {
      const closed = await api()
        .post(`/api/v1/sessions/${sessionId}/close`)
        .set(bearer(token))
        .expect(200);
      expect(closed.body).toEqual({ id: sessionId, status: 'closed' });

      await api()
        .post(`/api/v1/sessions/${sessionId}/close`)
        .set(bearer(token))
        .expect(409);
    });

    it('회원 탈퇴 시 푸드트럭과 하위 데이터가 함께 삭제된다', async () => {
      await api().delete('/api/v1/users/me').set(bearer(token)).expect(204);

      await api()
        .get('/api/v1/food-trucks/me')
        .set(bearer(token))
        .expect(401);
      await api()
        .get(`/api/v1/customer/food-trucks/${encodeURIComponent(shareSlug)}`)
        .expect(404);
      expect(
        await dataSource.getRepository(MenuItem).countBy({ foodTruckId }),
      ).toBe(0);
      expect(
        await dataSource.getRepository(DailySession).countBy({ foodTruckId }),
      ).toBe(0);

      // 재로그인하면 신규 가입으로 처리
      expect((await login('owner')).is_new_user).toBe(true);
    });
  });

  it('어제 메뉴 불러오기: 이전 영업 세션의 메뉴 구성으로 되돌린다', async () => {
    const { access_token: token } = await login('import-owner');
    const truck = await api()
      .post('/api/v1/food-trucks')
      .set(bearer(token))
      .send({ name: '길거리 떡볶이' })
      .expect(201);
    const foodTruckId: number = truck.body.id;

    const addMenu = async (name: string, price: number) =>
      (
        await api()
          .post(`/api/v1/food-trucks/${foodTruckId}/menus`)
          .set(bearer(token))
          .send({ name, price })
          .expect(201)
      ).body;
    const yesterdayMenu = await addMenu('떡볶이', 4000);
    const todayOnlyMenu = await addMenu('순대', 5000);

    const session = await api()
      .get(`/api/v1/food-trucks/${foodTruckId}/sessions/today`)
      .set(bearer(token))
      .expect(200);
    const importUrl = `/api/v1/sessions/${session.body.id}/menus/import-yesterday`;

    // 이전 영업 기록이 없으면 404
    await api().post(importUrl).set(bearer(token)).expect(404);

    // 어제는 '떡볶이'만 팔았고, 오늘은 '떡볶이'가 비활성화된 상태로 만든다.
    const previous = await dataSource.getRepository(DailySession).save({
      foodTruckId,
      date: yesterday,
      status: SessionStatus.CLOSED,
    });
    await dataSource.getRepository(SessionMenu).save({
      sessionId: previous.id,
      menuItemId: yesterdayMenu.id,
      name: yesterdayMenu.name,
      price: yesterdayMenu.price,
    });
    await api()
      .patch(`/api/v1/food-trucks/${foodTruckId}/menus/${yesterdayMenu.id}`)
      .set(bearer(token))
      .send({ is_active: false })
      .expect(200);

    const imported = await api().post(importUrl).set(bearer(token)).expect(200);
    expect(imported.body).toEqual({
      imported_count: 1,
      menus: [
        { id: yesterdayMenu.id, name: '떡볶이', price: 4000, is_sold_out: false },
      ],
    });

    const menus = await api()
      .get(`/api/v1/food-trucks/${foodTruckId}/menus`)
      .set(bearer(token))
      .expect(200);
    expect(
      menus.body.map((menu: { id: number; is_active: boolean }) => [
        menu.id,
        menu.is_active,
      ]),
    ).toEqual([
      [yesterdayMenu.id, true],
      [todayOnlyMenu.id, false],
    ]);
  });
});
