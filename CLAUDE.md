# CLAUDE.md

푸드트럭 위치 등록 앱 (오늘 어디서 팔아요) 백엔드.

## 규칙

1. Node.js 기준으로 작성한다.
2. MVP(Model-View-Presenter) 패턴을 준수한다.
3. API 는 `/api/v1` prefix, 인증은 Bearer Token(JWT) 을 사용한다.
4. 스키마·엔드포인트를 바꾸면 `ERD.md` 와 `API_SPEC.md` 를 함께 갱신한다.

## 문서

| 파일 | 내용 |
|------|------|
| `docs/ERD.md` | 엔티티 정의 및 관계 |
| `docs/API_SPEC.md` | REST API 명세 |
| Figma | https://www.figma.com/design/ar9b1OhdhNJZHZUEUyVPgz/%ED%91%B8%EB%93%9C%ED%8A%B8%EB%9F%AD-%EB%94%94%EC%9E%90%EC%9D%B8?node-id=0-1&m=dev |

## 스택 & 실행

- Express + Sequelize(MySQL) + JWT, CommonJS, 순수 JS
- `cp .env.example .env` 후 값 채우기 → `npm install` → `npm run dev`
- 개발 환경은 `sequelize.sync({ alter: true })` 로 스키마 반영 (운영 전 마이그레이션 전환 예정)
- API 문서: Swagger UI `GET /docs`, 원본 스펙 `GET /docs.json`. 스펙은 `src/docs/openapi.js` 수기 관리 — 엔드포인트 변경 시 `API_SPEC.md` 와 함께 갱신.

## 프로젝트 구조 (MVP)

```
src/
├── models/       Model 계층 - Sequelize 엔티티 + 연관관계 (models/index.js 에서 초기화)
├── views/        View 계층 - 응답 JSON 직렬화
├── presenters/   Presenter 계층 - 요청 처리 오케스트레이션 (req → service/model → view)
├── routes/       엔드포인트 정의 + Joi 검증 연결 (routes/index.js 가 /api/v1 결합)
├── middlewares/  auth(JWT) / validate(Joi) / notFound / error
├── services/     재사용 로직 (token.service, socialAuth.service)
├── docs/         openapi.js - Swagger UI 스펙 (수기 관리)
├── config/       env 로딩(index.js) + sequelize-cli 설정(database.js)
├── app.js        express 앱 구성
└── server.js     DB 연결 후 listen
```

- 새 도메인 추가 시: `model → view → presenter → routes` 순서로 만들고 `routes/index.js` 에 마운트.
- 현재 인증(auth/users)만 구현됨. FoodTruck·Location·Menu·Session·Customer·Notification 은 미구현.
- `socialAuth.service.verifySocialToken` 은 kakao/google 사용자 정보 API 연동 TODO 상태.

## 도메인 개요

- **사장님**: 소셜 로그인 → 푸드트럭 등록 → 자주 가는 장소/메뉴 관리 → 날짜별 영업 세션(준비중 → 오픈 → 종료) 운영.
- **손님**: 로그인 없이 내 주변 푸드트럭 조회, 공유 URL 로 상세 조회, 오픈 알림 구독.

### 엔티티

`User` → `FoodTruck` (1:N) → `FavoriteLocation` / `DailySession` / `MenuItem` (각 1:N)
`DailySession` → `SessionMenu` (1:N), `SessionMenu` → `MenuItem` (N:1)
`FoodTruck` → `NotificationSubscription` (1:N)

## 핵심 설계 결정

- **역할(role) 구분 없음**: 별도 역할 선택 단계를 두지 않는다. 로그인한 유저가 푸드트럭을 등록하면 그 유저가 소유자(사장님)가 되고, 손님 화면 API 는 인증이 필요 없다.
- **리프레시 토큰은 User 레코드에서 관리**: 별도 테이블 없이 `User.refresh_token_hash` / `refresh_token_expires_at` 컬럼 사용. 유저당 1개만 유지하며 재발급 시 rotation → 다른 기기에서 로그인/재발급하면 이전 토큰은 만료된다. 토큰 원문은 저장하지 않고 해시만 저장한다.
- **회원 탈퇴는 soft delete**: `User.deleted_at` 기록 + refresh token 무효화, 보유한 푸드트럭·세션·메뉴는 함께 삭제.
- **세션 메뉴는 스냅샷**: 오픈 시점의 메뉴 이름·가격을 `SessionMenu` 에 복사해 이후 메뉴 수정이 지난 영업 기록에 영향을 주지 않도록 한다.

## 인증 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| POST | `/api/v1/auth/social` | 소셜 로그인 (kakao / google), access + refresh 발급 |
| POST | `/api/v1/auth/refresh` | 토큰 재발급 (rotation) |
| POST | `/api/v1/auth/logout` | refresh token 무효화 |
| DELETE | `/api/v1/users/me` | 회원 탈퇴 (soft delete) |
