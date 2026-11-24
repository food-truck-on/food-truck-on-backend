# API 명세서

> 푸드트럭 위치 등록 앱 / Node.js + MVP 패턴
> Base URL: `/api/v1`
> 인증: Bearer Token (JWT)

---

## 목차
1. [인증 (Auth)](#1-인증-auth)
2. [푸드트럭 (FoodTruck)](#2-푸드트럭-foodtruck)
3. [위치 (Location)](#3-위치-location)
4. [메뉴 (Menu)](#4-메뉴-menu)
   - [4-6. 메뉴 품절 토글](#4-6-메뉴-품절-토글)
5. [영업 세션 (Session)](#5-영업-세션-session)
6. [손님 화면 (Customer)](#6-손님-화면-customer)
7. [알림 (Notification)](#7-알림-notification)

---

## 1. 인증 (Auth)

> 별도의 역할 선택 단계는 없다. 로그인한 사용자가 푸드트럭을 등록하면 자동으로 사장님(소유자)이 되고,
> 손님 화면 API는 인증이 필요 없다.

### 1-1. 소셜 로그인 (Authorization Code + `?code=` 전달)

> 서버가 소셜 제공자(kakao / google)와의 OAuth 과정을 처리하고, 프론트엔드에는 **1회용 `code`** 만 쿼리스트링으로 넘긴다.
> 토큰(access_token / refresh_token)은 URL 에 노출하지 않고, 프론트엔드가 `code` 를 [1-1-3](#1-1-3-로그인-code-교환) 으로 교환해 받는다.
> 가입되지 않은 사용자는 자동 가입된다.

**흐름**
```
프론트엔드                     백엔드                              소셜 제공자
    │ ① 브라우저 이동                │                                    │
    │  GET /auth/{provider}  ──────▶│                                    │
    │                              │ ② 302 로그인 페이지 (state 포함) ──▶│
    │                              │                                    │ 사용자 로그인·동의
    │                              │◀── ③ GET /auth/{provider}/callback?code=…&state=…
    │                              │  제공자 code → 토큰 교환, 프로필 조회, 가입/로그인
    │◀── ④ 302 {FRONTEND_LOGIN_REDIRECT_URL}?code=<1회용 code>      │
    │ ⑤ POST /auth/token { code } ─▶│                                    │
    │◀──── access_token, refresh_token, user, is_new_user           │
```

#### 1-1-1. 소셜 로그인 시작
```
GET /api/v1/auth/{provider}
```
> 인증 불필요. 프론트엔드는 `fetch` 가 아니라 **브라우저 이동**(`location.href`, `<a href>`)으로 호출한다.

**Path Parameter**
| 파라미터 | 타입 | 설명 |
|---------|------|------|
| provider | string | `kakao` \| `google` |

**Response 302** — 소셜 제공자 로그인 페이지로 리다이렉트
```
Location: https://kauth.kakao.com/oauth/authorize?response_type=code&client_id=…&redirect_uri=…&state=…
```
> `state` 는 CSRF 방지용 서명 값(유효 10분)으로, 콜백에서 검증한다.

**에러**
| HTTP Status | 설명 |
|------------|------|
| 400 | 지원하지 않는 provider |

---

#### 1-1-2. 소셜 로그인 콜백
```
GET /api/v1/auth/{provider}/callback?code={providerCode}&state={state}
```
> 소셜 제공자가 호출하는 Redirect URI. 제공자 콘솔에 `{API_BASE_URL}/api/v1/auth/{provider}/callback` 으로 등록한다.
> 프론트엔드가 직접 호출하지 않는다.

**Query Parameter** (제공자가 붙여 줌)
| 파라미터 | 타입 | 설명 |
|---------|------|------|
| code | string | 소셜 제공자가 발급한 인가 코드 |
| state | string | 1-1-1 에서 서버가 발급한 state |
| error | string | 사용자가 동의를 거부하는 등 실패 시 |

**Response 302** — 프론트엔드(`FRONTEND_LOGIN_REDIRECT_URL`)로 리다이렉트

성공
```
Location: http://localhost:3000/auth/callback?code=Xk3v…
```

실패
```
Location: http://localhost:3000/auth/callback?error=login_failed
```

| error 값 | 설명 |
|---------|------|
| access_denied | 사용자가 소셜 로그인 동의를 거부함 |
| invalid_request | 제공자 code 가 없음 |
| invalid_state | state 가 없거나 위조·만료되었거나 provider 가 다름 |
| login_failed | 제공자 토큰 교환 또는 프로필 조회 실패 |

> 전달되는 `code` 는 **1회용**이며 **3분** 후 만료된다. 서버에는 해시값만 저장한다 ([ERD AuthCode](./ERD.md)).

---

#### 1-1-3. 로그인 code 교환
```
POST /api/v1/auth/token
```
> 인증 불필요. 프론트엔드 콜백 페이지에서 쿼리스트링의 `code` 를 꺼내 바로 호출한다.

**Request Body**
```json
{
  "code": "string"
}
```

**Response 200**
```json
{
  "access_token": "string",
  "refresh_token": "string",
  "user": {
    "id": 1,
    "nickname": "string"
  },
  "is_new_user": true
}
```

**에러**
| HTTP Status | 설명 |
|------------|------|
| 400 | code 누락 |
| 401 | code 가 유효하지 않거나 만료되었거나 이미 사용됨 |

---

### 1-2. 토큰 재발급
```
POST /api/v1/auth/refresh
```
> 인증 불필요 (refresh_token 으로 검증)

**Request Body**
```json
{
  "refresh_token": "string"
}
```

**Response 200**
```json
{
  "access_token": "string",
  "refresh_token": "string"
}
```
> 기존 refresh_token 은 무효화되고 새 토큰이 발급된다 (rotation).
> refresh_token 은 User 레코드에 유저당 1개만 저장되므로, 다른 기기에서 로그인/재발급하면 이전 토큰은 만료된다.

**에러**
| HTTP Status | 설명 |
|------------|------|
| 401 | refresh_token 이 유효하지 않거나 만료됨 |

---

### 1-3. 로그아웃
```
POST /api/v1/auth/logout
```
> 인증 필요

**Response 204** (No Content)
> User 의 access_token, refresh_token_hash 를 NULL 로 만들어 무효화한다.

---

### 1-4. 회원 탈퇴
```
DELETE /api/v1/users/me
```
> 인증 필요

**Response 204** (No Content)
> 사용자를 탈퇴 처리하고(soft delete, deleted_at 기록 + 토큰·미사용 로그인 code 무효화), 보유한 푸드트럭·세션·메뉴를 함께 삭제한다.

---

## 2. 푸드트럭 (FoodTruck)

### 2-1. 내 푸드트럭 조회
```
GET /api/v1/food-trucks/me
```
> 인증 필요 (사장님)

**Response 200**
```json
{
  "id": 1,
  "name": "타코야끼 달인",
  "share_url": "https://오늘어디서팔아요.kr/tk-달인-오늘",
  "today_session": {
    "status": "preparing | open | closed",
    "location_label": "행복아파트 정문 앞",
    "menu_count": 3
  }
}
```

---

### 2-2. 푸드트럭 등록
```
POST /api/v1/food-trucks
```
> 인증 필요 (사장님)

**Request Body**
```json
{
  "name": "타코야끼 달인"
}
```

**Response 201**
```json
{
  "id": 1,
  "name": "타코야끼 달인",
  "share_url": "https://오늘어디서팔아요.kr/tk-달인-오늘"
}
```

---

## 3. 위치 (Location)

### 3-1. 자주 가는 장소 목록 조회
```
GET /api/v1/food-trucks/:foodTruckId/locations
```
> 인증 필요 (사장님)

**Response 200**
```json
[
  {
    "id": 1,
    "name": "행복아파트 정문",
    "address": "행복아파트 정문 앞",
    "latitude": 37.1234567,
    "longitude": 127.1234567
  },
  {
    "id": 2,
    "name": "중앙공원 주차장",
    "address": "중앙공원 주차장 입구",
    "latitude": 37.2345678,
    "longitude": 127.2345678
  }
]
```

---

### 3-2. 자주 가는 장소 추가
```
POST /api/v1/food-trucks/:foodTruckId/locations
```
> 인증 필요 (사장님)

**Request Body**
```json
{
  "name": "행복아파트 정문",
  "address": "행복아파트 정문 앞",
  "latitude": 37.1234567,
  "longitude": 127.1234567
}
```

**Response 201**
```json
{
  "id": 1,
  "name": "행복아파트 정문",
  "address": "행복아파트 정문 앞",
  "latitude": 37.1234567,
  "longitude": 127.1234567
}
```

---

### 3-3. 자주 가는 장소 삭제
```
DELETE /api/v1/food-trucks/:foodTruckId/locations/:locationId
```
> 인증 필요 (사장님)

**Response 204** (No Content)

---

### 3-4. 오늘 세션 위치 설정
```
PATCH /api/v1/sessions/:sessionId/location
```
> 인증 필요 (사장님)

**Request Body**
```json
{
  "location_id": 1,
  "latitude": 37.1234567,
  "longitude": 127.1234567,
  "location_label": "행복아파트 정문 앞"
}
```

**Response 200**
```json
{
  "session_id": 1,
  "location_label": "행복아파트 정문 앞",
  "latitude": 37.1234567,
  "longitude": 127.1234567
}
```

---

## 4. 메뉴 (Menu)

### 4-1. 메뉴 목록 조회
```
GET /api/v1/food-trucks/:foodTruckId/menus
```
> 인증 필요 (사장님)

**Response 200**
```json
[
  {
    "id": 1,
    "name": "타코야끼 8알",
    "price": 5000,
    "is_sold_out": false,
    "sold_out_date": null,
    "is_active": true
  },
  {
    "id": 2,
    "name": "타코야끼 12알",
    "price": 7000,
    "is_sold_out": false,
    "sold_out_date": null,
    "is_active": true
  }
]
```
> `sold_out_date`가 오늘(KST) 날짜가 아니면 서버가 자동으로 `is_sold_out: false`로 내려줍니다. (당일에만 품절 유지, 다음날 자동 해제)

---

### 4-2. 메뉴 추가
```
POST /api/v1/food-trucks/:foodTruckId/menus
```
> 인증 필요 (사장님)

**Request Body**
```json
{
  "name": "새 메뉴",
  "price": 5000
}
```

**Response 201**
```json
{
  "id": 3,
  "name": "새 메뉴",
  "price": 5000,
  "is_sold_out": false,
  "sold_out_date": null,
  "is_active": true
}
```

---

### 4-3. 메뉴 수정
```
PATCH /api/v1/food-trucks/:foodTruckId/menus/:menuId
```
> 인증 필요 (사장님)
> 이름/가격/활성화 여부 수정용. 품절 여부 변경은 4-6 메뉴 품절 토글 API를 사용하세요.

**Request Body**
```json
{
  "name": "타코야끼 8알",
  "price": 5500
}
```

**Response 200**
```json
{
  "id": 1,
  "name": "타코야끼 8알",
  "price": 5500,
  "is_sold_out": false,
  "sold_out_date": null,
  "is_active": true
}
```

---

### 4-4. 메뉴 삭제
```
DELETE /api/v1/food-trucks/:foodTruckId/menus/:menuId
```
> 인증 필요 (사장님)

**Response 204** (No Content)

---

### 4-5. 어제 메뉴 불러오기
```
POST /api/v1/sessions/:sessionId/menus/import-yesterday
```
> 인증 필요 (사장님)

**Response 200**
```json
{
  "imported_count": 3,
  "menus": [
    { "id": 1, "name": "타코야끼 8알", "price": 5000, "is_sold_out": false },
    { "id": 2, "name": "타코야끼 12알", "price": 7000, "is_sold_out": false },
    { "id": 3, "name": "치즈 타코야끼", "price": 6000, "is_sold_out": false }
  ]
}
```

---

### 4-6. 메뉴 품절 토글
```
PATCH /api/v1/food-trucks/:foodTruckId/menus/:menuId/sold-out
```
> 인증 필요 (사장님)
> 현재 품절 상태를 반전(toggle)시킵니다. Request Body가 없습니다.
>
> **동작 방식**
> - 품절 아님 → 품절: `is_sold_out = true`, `sold_out_date = 오늘(KST)`로 저장
> - 품절 → 품절 아님: `is_sold_out = false`, `sold_out_date = null`로 저장
> - 품절은 **당일까지만 유지**되며, 날짜가 바뀌면(자정 KST 기준) 자동으로 해제됩니다. 즉 `sold_out_date`가 오늘이 아닌 상태로 조회/토글되면 서버가 먼저 `is_sold_out = false`로 리셋한 뒤 처리합니다.

**Response 200**
```json
{
  "id": 1,
  "name": "타코야끼 8알",
  "is_sold_out": true,
  "sold_out_date": "2026-09-09"
}
```

**Response 200 (해제된 경우)**
```json
{
  "id": 1,
  "name": "타코야끼 8알",
  "is_sold_out": false,
  "sold_out_date": null
}
```

---

## 5. 영업 세션 (Session)

### 5-1. 오늘 세션 조회 혹은 세션
```
GET /api/v1/food-trucks/:foodTruckId/sessions/today
```
> 인증 필요 (사장님)

**Response 200**
```json
{
  "id": 1,
  "date": "2026-09-08",
  "status": "preparing",
  "location_label": "행복아파트 정문 앞",
  "menu_count": 3,
  "menus": [
    { "id": 1, "name": "타코야끼 8알 외 2개" }
  ]
}
```

---

### 5-2. 오픈하기
```
POST /api/v1/sessions/:sessionId/open
```
> 인증 필요 (사장님)
> 위치와 메뉴가 모두 설정된 경우에만 가능

**Response 200**
```json
{
  "id": 1,
  "status": "open",
  "opened_at": "2026-09-05T16:00:00Z",
  "share_url": "https://오늘어디서팔아요.kr/tk-달인-오늘"
}
```

---

### 5-3. 영업 종료
```
POST /api/v1/sessions/:sessionId/close
```
> 인증 필요 (사장님)

**Response 200**
```json
{
  "id": 1,
  "status": "closed"
}
```

---

## 6. 손님 화면 (Customer)

### 6-1. 내 주변 푸드트럭 목록 조회
```
GET /api/v1/customer/food-trucks/nearby
```
> 인증 불필요

**Query Parameters**
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| lat | number | Y | 현재 위도 |
| lng | number | Y | 현재 경도 |
| radius | number | N | 반경 (m, 기본값: 1000) |

**Response 200**
```json
{
  "total": 4,
  "open_count": 2,
  "food_trucks": [
    {
      "id": 1,
      "name": "타코야끼 달인",
      "status": "preparing",
      "location_label": "행복아파트 정문 앞",
      "open_time": "16:00",
      "close_time": "21:00",
      "distance_m": 120,
      "latitude": 37.1234567,
      "longitude": 127.1234567
    },
    {
      "id": 2,
      "name": "길거리 떡볶이",
      "status": "open",
      "location_label": "중앙공원 주차장 입구",
      "open_time": "15:00",
      "close_time": "20:00",
      "distance_m": 280,
      "latitude": 37.2345678,
      "longitude": 127.2345678
    }
  ]
}
```

---

### 6-2. 푸드트럭 상세 조회 (공유 URL 기반)
```
GET /api/v1/customer/food-trucks/:shareSlug
```
> 인증 불필요

**Response 200**
```json
{
  "id": 1,
  "name": "타코야끼 달인",
  "status": "preparing",
  "location_label": "행복아파트 정문 앞",
  "open_time": "16:00",
  "close_time": "21:00",
  "distance_m": 120,
  "latitude": 37.1234567,
  "longitude": 127.1234567,
  "menus": [
    { "id": 1, "name": "타코야끼 8알", "price": 5000, "is_sold_out": false },
    { "id": 2, "name": "타코야끼 12알", "price": 7000, "is_sold_out": false },
    { "id": 3, "name": "치즈 타코야끼", "price": 6000, "is_sold_out": false }
  ]
}
```

---

## 7. 알림 (Notification)

### 7-1. 오픈 알림 구독
```
POST /api/v1/customer/food-trucks/:foodTruckId/subscribe
```
> 인증 불필요

**Request Body**
```json
{
  "device_token": "string"
}
```

**Response 201**
```json
{
  "food_truck_id": 1,
  "subscribed": true
}
```

---

### 7-2. 주변 트럭 오픈 알림 구독
```
POST /api/v1/customer/notifications/nearby
```
> 인증 불필요

**Request Body**
```json
{
  "device_token": "string",
  "latitude": 37.1234567,
  "longitude": 127.1234567,
  "radius_m": 500
}
```

**Response 201**
```json
{
  "subscribed": true
}
```

---

## 공통 에러 응답

| HTTP Status | 설명 |
|------------|------|
| 400 | Bad Request - 요청 파라미터 오류 |
| 401 | Unauthorized - 인증 토큰 없음 또는 만료 |
| 403 | Forbidden - 권한 없음 |
| 404 | Not Found - 리소스 없음 |
| 409 | Conflict - 중복 데이터 |
| 500 | Internal Server Error |

**에러 응답 형식**
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "인증이 필요합니다."
  }
}
```
