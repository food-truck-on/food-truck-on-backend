# 가상 데이터 (Seed) 규칙

프론트엔드 개발·시연용 가상 푸드트럭 데이터를 넣는 방법과 지켜야 할 규칙이다.

## 규칙

1. 가상 데이터는 DB 에 직접 넣지 않고 반드시 `npm run seed` 로 넣는다. 내용을 바꿀 때는 `src/database/seed/seed-data.ts` 를 고친 뒤 다시 실행한다.
2. 주변 조회(`GET /customer/food-trucks/nearby`)는 **오늘(KST) 날짜의 세션**만 돌려준다. 가상 세션은 실행한 날부터 `SEED_DAYS`(기본 7)일치만 들어가므로, 주변 조회가 0대로 오면 먼저 `npm run seed` 를 다시 실행한다.
3. 가상 트럭은 기준 좌표(`SEED_LAT`, `SEED_LNG`) 주변에만 놓인다. 프론트엔드가 조회에 쓰는 좌표와 기준 좌표가 다르면 0대가 나오므로 둘을 맞춘다.
4. 가상 데이터는 접두사로 실제 데이터와 구분한다. 접두사를 바꾸거나 떼지 않는다.
   - 사용자 `users.provider_id`: `seed:owner-{키}`
   - 공유 slug `food_trucks.share_url`: `seed-{키}`
5. `seed-data.ts` 의 `key` 는 고정 식별자다. 바꾸면 기존 트럭이 수정되지 않고 새 트럭이 추가된다.
6. 운영 DB 에는 넣지 않는다. `NODE_ENV=production` 이면 스크립트가 실행을 거부한다.
7. 가상 데이터를 지울 때는 `npm run seed:clear` 를 쓴다. `seed:` 사용자만 지우며, 딸린 트럭·메뉴·세션은 FK CASCADE 로 함께 지워진다.

## 실행

```bash
npm run seed         # 넣기 (여러 번 실행해도 중복으로 생기지 않는다)
npm run seed:clear   # 지우기
```

스크립트는 서버와 같은 `.env` 의 `DB_URL` 에 연결한다.

| 환경변수 | 기본값 | 설명 |
|---|---|---|
| `SEED_LAT` | `37.5665` | 기준 위도 (기본: 서울시청) |
| `SEED_LNG` | `126.978` | 기준 경도 |
| `SEED_DAYS` | `7` | 오늘(KST)부터 세션을 넣을 일수 (1 ~ 60) |

## 들어가는 데이터

트럭 1대마다 사용자 1명, 메뉴 2 ~ 4개, 날짜별 영업 세션이 들어간다. 영업을 시작한 세션(`open`, `closed`)에는 메뉴 스냅샷(`session_menus`)도 함께 들어간다.

| 키 | 이름 | 상태 | 기준 좌표에서 거리 | 기본 반경(1km) |
|---|---|---|---|---|
| `takoyaki` | 타코야끼 달인 | open | 약 144m | 안 |
| `dakkochi` | 불맛 닭꼬치 | open | 약 308m | 안 |
| `tteokbokki` | 할매 떡볶이 | open | 약 484m | 안 |
| `coffee` | 커피 한잔 트럭 | open | 약 661m | 안 |
| `hotdog` | 수제 핫도그 스탠드 | preparing | 약 757m | 안 |
| `bungeoppang` | 황금 붕어빵 | closed | 약 871m | 안 |
| `burger` | 수제버거 팩토리 | open | 약 1.7km | 밖 |
| `taco` | 멕시칸 타코 트럭 | preparing | 약 2.5km | 밖 |

- 기본 반경(1km)으로 조회하면 6대(영업 중 4대), 반경 3km 로 조회하면 8대(영업 중 5대)가 나온다.
- `open`·`closed` 세션의 시작 시각은 11:00, `closed` 세션의 종료 시각은 20:00 이다.
- `타코야끼 달인`의 `치즈 타코야끼`는 품절로 들어간다. 품절은 다음 날 자동 해제되므로(ERD 의 품절 자동 해제 규칙) 다시 품절로 보려면 `npm run seed` 를 다시 실행한다.

## 확인

```bash
curl "http://localhost:3000/api/v1/customer/food-trucks/nearby?lat=37.5665&lng=126.978"
curl "http://localhost:3000/api/v1/customer/food-trucks/seed-takoyaki?lat=37.5665&lng=126.978"
```

## 한계

- 가상 사용자는 소셜 계정이 없어 로그인할 수 없다. 사장님용(로그인 필요) API 는 이 데이터로 확인할 수 없다.
