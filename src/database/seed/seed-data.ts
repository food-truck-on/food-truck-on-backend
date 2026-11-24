import { SessionStatus } from '../../sessions/entities/daily-session.entity.js';

export interface SeedMenu {
  name: string;
  price: number;
  /** true 면 오늘 품절로 넣는다. (품절은 다음 날 자동 해제된다) */
  soldOut?: boolean;
}

export interface SeedTruck {
  /** provider_id(seed:owner-키) 와 공유 slug(seed-키) 에 쓰는 고정 키. 바꾸면 새 트럭으로 들어간다. */
  key: string;
  name: string;
  /** 기준 좌표에서 북쪽(+)/남쪽(-) 으로 떨어진 거리 (m) */
  northM: number;
  /** 기준 좌표에서 동쪽(+)/서쪽(-) 으로 떨어진 거리 (m) */
  eastM: number;
  status: SessionStatus;
  locationLabel: string;
  menus: SeedMenu[];
}

/** 기본 기준 좌표: 서울시청. SEED_LAT / SEED_LNG 로 바꾼다. */
export const DEFAULT_SEED_CENTER = { lat: 37.5665, lng: 126.978 };

/** 세션을 오늘(KST)부터 며칠치 넣을지. SEED_DAYS 로 바꾼다. */
export const DEFAULT_SEED_DAYS = 7;

export const SEED_OPEN_TIME = '11:00:00';
export const SEED_CLOSE_TIME = '20:00:00';

/** 가상 데이터를 실제 데이터와 구분하는 접두사 */
export const SEED_PROVIDER_ID_PREFIX = 'seed:';
export const SEED_SHARE_SLUG_PREFIX = 'seed-';

/**
 * 앞의 6대는 기본 반경(1km) 안, 뒤의 2대는 1~3km 사이에 둔다.
 * 반경 필터가 동작하는지 확인할 수 있도록 일부러 섞었다.
 */
export const SEED_TRUCKS: SeedTruck[] = [
  {
    key: 'takoyaki',
    name: '타코야끼 달인',
    northM: 120,
    eastM: 80,
    status: SessionStatus.OPEN,
    locationLabel: '시청역 5번 출구 앞',
    menus: [
      { name: '타코야끼 8알', price: 5000 },
      { name: '타코야끼 12알', price: 7000 },
      { name: '치즈 타코야끼', price: 6000, soldOut: true },
    ],
  },
  {
    key: 'dakkochi',
    name: '불맛 닭꼬치',
    northM: -250,
    eastM: 180,
    status: SessionStatus.OPEN,
    locationLabel: '광장 남측 주차장 입구',
    menus: [
      { name: '소금구이 닭꼬치', price: 4000 },
      { name: '매운 양념 닭꼬치', price: 4500 },
      { name: '파닭꼬치', price: 4500 },
    ],
  },
  {
    key: 'tteokbokki',
    name: '할매 떡볶이',
    northM: 380,
    eastM: -300,
    status: SessionStatus.OPEN,
    locationLabel: '공원 정문 옆',
    menus: [
      { name: '떡볶이', price: 4500 },
      { name: '모둠 튀김', price: 5000 },
      { name: '순대', price: 5000 },
      { name: '어묵 2꼬치', price: 2000 },
    ],
  },
  {
    key: 'coffee',
    name: '커피 한잔 트럭',
    northM: -520,
    eastM: -410,
    status: SessionStatus.OPEN,
    locationLabel: '오피스 타운 후문',
    menus: [
      { name: '아메리카노', price: 3000 },
      { name: '카페라떼', price: 4000 },
      { name: '레몬에이드', price: 4500 },
    ],
  },
  {
    key: 'hotdog',
    name: '수제 핫도그 스탠드',
    northM: 610,
    eastM: 450,
    status: SessionStatus.PREPARING,
    locationLabel: '사거리 은행 앞',
    menus: [
      { name: '오리지널 핫도그', price: 3500 },
      { name: '감자 핫도그', price: 4500 },
      { name: '모짜렐라 핫도그', price: 4500 },
    ],
  },
  {
    key: 'bungeoppang',
    name: '황금 붕어빵',
    northM: -700,
    eastM: 520,
    status: SessionStatus.CLOSED,
    locationLabel: '버스 정류장 옆',
    menus: [
      { name: '팥 붕어빵 3개', price: 2000 },
      { name: '슈크림 붕어빵 3개', price: 2000 },
    ],
  },
  {
    key: 'burger',
    name: '수제버거 팩토리',
    northM: 1400,
    eastM: 900,
    status: SessionStatus.OPEN,
    locationLabel: '대학로 입구 공터',
    menus: [
      { name: '클래식 버거', price: 8500 },
      { name: '치즈 버거', price: 9500 },
      { name: '감자튀김', price: 4000 },
    ],
  },
  {
    key: 'taco',
    name: '멕시칸 타코 트럭',
    northM: -2000,
    eastM: -1500,
    status: SessionStatus.PREPARING,
    locationLabel: '한강 공원 주차장',
    menus: [
      { name: '비프 타코 2개', price: 8000 },
      { name: '치킨 타코 2개', price: 7500 },
      { name: '나초', price: 5000 },
    ],
  },
];
