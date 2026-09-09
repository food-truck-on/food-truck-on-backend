# 푸드트럭 위치 등록 앱 - 백엔드

> Node.js + MVP 패턴 / Base URL `/api/v1` / 인증: Bearer Token (JWT)
> 상세 설계 문서: [ERD.md](./ERD.md), [API_SPEC.md](./API_SPEC.md)

### 규칙

1. Node.js 기준으로 작성한다.
2. MVP 패턴을 준수한다.

---

### 엔티티 개요 (상세: [ERD.md](./ERD.md))

| 엔티티 | 설명 |
|--------|------|
| User | 사용자 (사장님 `owner` / 손님 `customer`), 카카오·구글 소셜 로그인 |
| FoodTruck | 푸드트럭. 사장님(User) 소유, 고유 `share_url` 보유 |
| FavoriteLocation | 푸드트럭이 자주 가는 장소 목록 |
| DailySession | 날짜별 영업 세션 (`preparing → open → closed`), 당일 위치/영업시간 저장 |
| MenuItem | 메뉴 마스터. 가격, 품절 여부(`is_sold_out` + `sold_out_date`), 활성화 여부 |
| SessionMenu | 세션(하루) 오픈 시점의 메뉴 스냅샷 |
| NotificationSubscription | 손님의 오픈 알림 구독 (디바이스 토큰) |

**관계**: User 1:N FoodTruck / FoodTruck 1:N (FavoriteLocation, DailySession, MenuItem, NotificationSubscription) / DailySession 1:N SessionMenu / MenuItem 1:N SessionMenu

---

### API 개요 (상세: [API_SPEC.md](./API_SPEC.md))

| # | 도메인 | 주요 엔드포인트 |
|---|--------|----------------|
| 1 | 인증 (Auth) | `POST /auth/social` 소셜 로그인, `PATCH /auth/role` 역할 선택 |
| 2 | 푸드트럭 (FoodTruck) | `GET /food-trucks/me`, `POST /food-trucks` |
| 3 | 위치 (Location) | 자주 가는 장소 CRUD, `PATCH /sessions/:id/location` 오늘 위치 설정 |
| 4 | 메뉴 (Menu) | 메뉴 CRUD, `POST .../menus/import-yesterday` 어제 메뉴 불러오기, `PATCH .../menus/:id/sold-out` **품절 토글** |
| 5 | 영업 세션 (Session) | `GET /sessions/today`, `POST /sessions/:id/open`, `POST /sessions/:id/close` |
| 6 | 손님 화면 (Customer) | `GET /customer/food-trucks/nearby`, `GET /customer/food-trucks/:shareSlug` (인증 불필요) |
| 7 | 알림 (Notification) | 오픈 알림 / 주변 트럭 알림 구독 (인증 불필요) |

공통 에러 포맷: `{ "error": { "code": "...", "message": "..." } }` (400/401/403/404/409/500)

---

### 비즈니스 규칙

1. **메뉴 품절 상태는 당일(KST 기준)에만 유지되고, 날짜가 바뀌면 자동으로 해제된다.**
   - `MenuItem`에 `sold_out_date`(품절 처리 날짜) 컬럼을 두고, 조회/토글 시점에 `sold_out_date`가 오늘이 아니면 `is_sold_out`을 `false`로 lazy reset한다.
   - 관련 API: `PATCH /api/v1/food-trucks/:foodTruckId/menus/:menuId/sold-out` (메뉴 품절 토글)
   - 상세: [ERD.md](./ERD.md) MenuItem 엔티티, [API_SPEC.md](./API_SPEC.md) 4-6 참고
2. **세션(`DailySession`)은 날짜별로 하나씩 생성되며, 오픈(`open`) 시점의 메뉴는 `SessionMenu`에 스냅샷으로 저장된다.** 오픈 이후 `MenuItem`을 수정해도 이미 오픈된 세션의 스냅샷에는 소급 반영되지 않는다.
3. **세션 오픈(`POST /sessions/:sessionId/open`)은 위치와 메뉴가 모두 설정된 경우에만 가능하다.**

---

### 사용

1. 해당하는 Figma 주소를 참고하여 ERD를 구성하라
2. 해당하는 Figma 주소를 참고하여 API 명세서를 구성하라
3. 1번과 2번에 해당하는 문서는 .md 파일로 정리해줘

### 참고할 Figma 주소
https://www.figma.com/design/ar9b1OhdhNJZHZUEUyVPgz/%ED%91%B8%EB%93%9C%ED%8A%B8%EB%9F%AD-%EB%94%94%EC%9E%90%EC%9D%B8?node-id=0-1&m=dev
