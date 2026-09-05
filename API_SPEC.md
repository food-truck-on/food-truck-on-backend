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
5. [영업 세션 (Session)](#5-영업-세션-session)
6. [손님 화면 (Customer)](#6-손님-화면-customer)
7. [알림 (Notification)](#7-알림-notification)

---

## 1. 인증 (Auth)

### 1-1. 소셜 로그인
```
POST /api/v1/auth/social
```

**Request Body**
```json
{
  "provider": "kakao | google",
  "provider_token": "string"
}
```

**Response 200**
```json
{
  "access_token": "string",
  "user": {
    "id": 1,
    "role": "owner | customer",
    "nickname": "string"
  },
  "is_new_user": true
}
```

---

### 1-2. 역할 선택 (신규 사용자)
```
PATCH /api/v1/auth/role
```
> 인증 필요

**Request Body**
```json
{
  "role": "owner | customer"
}
```

**Response 200**
```json
{
  "id": 1,
  "role": "owner",
  "nickname": "string"
}
```

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
    "is_active": true
  },
  {
    "id": 2,
    "name": "타코야끼 12알",
    "price": 7000,
    "is_sold_out": false,
    "is_active": true
  }
]
```

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
  "is_active": true
}
```

---

### 4-3. 메뉴 수정
```
PATCH /api/v1/food-trucks/:foodTruckId/menus/:menuId
```
> 인증 필요 (사장님)

**Request Body**
```json
{
  "name": "타코야끼 8알",
  "price": 5500,
  "is_sold_out": true
}
```

**Response 200**
```json
{
  "id": 1,
  "name": "타코야끼 8알",
  "price": 5500,
  "is_sold_out": true,
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

## 5. 영업 세션 (Session)

### 5-1. 오늘 세션 조회 또는 생성
```
GET /api/v1/food-trucks/:foodTruckId/sessions/today
```
> 인증 필요 (사장님)

**Response 200**
```json
{
  "id": 1,
  "date": "2026-09-05",
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
