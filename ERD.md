# ERD (Entity Relationship Diagram)

> 푸드트럭 위치 등록 앱 기준 / Node.js + MVP 패턴

---

## 엔티티 목록

### 1. User (사용자)
| 컬럼명 | 타입 | 제약 | 설명 |
|--------|------|------|------|
| id | INT | PK, AUTO_INCREMENT | 사용자 ID |
| role | ENUM('owner', 'customer') | NOT NULL | 역할 (사장님 / 손님) |
| provider | ENUM('kakao', 'google') | NOT NULL | 소셜 로그인 제공자 |
| provider_id | VARCHAR(255) | NOT NULL, UNIQUE | 소셜 로그인 고유 ID |
| nickname | VARCHAR(100) | NOT NULL | 닉네임 |
| created_at | DATETIME | NOT NULL | 생성일시 |
| updated_at | DATETIME | NOT NULL | 수정일시 |

---

### 2. FoodTruck (푸드트럭)
| 컬럼명 | 타입 | 제약 | 설명 |
|--------|------|------|------|
| id | INT | PK, AUTO_INCREMENT | 푸드트럭 ID |
| owner_id | INT | FK(User.id), NOT NULL | 사장님 사용자 ID |
| name | VARCHAR(100) | NOT NULL | 푸드트럭 이름 |
| share_url | VARCHAR(255) | UNIQUE | 공유 URL (예: /tk-달인-오늘) |
| created_at | DATETIME | NOT NULL | 생성일시 |
| updated_at | DATETIME | NOT NULL | 수정일시 |

---

### 3. FavoriteLocation (자주 가는 장소)
| 컬럼명 | 타입 | 제약 | 설명 |
|--------|------|------|------|
| id | INT | PK, AUTO_INCREMENT | 장소 ID |
| food_truck_id | INT | FK(FoodTruck.id), NOT NULL | 푸드트럭 ID |
| name | VARCHAR(100) | NOT NULL | 장소 이름 (예: 행복아파트 정문) |
| address | VARCHAR(255) | NOT NULL | 주소 (예: 행복아파트 정문 앞) |
| latitude | DECIMAL(10,7) | NOT NULL | 위도 |
| longitude | DECIMAL(10,7) | NOT NULL | 경도 |
| created_at | DATETIME | NOT NULL | 생성일시 |

---

### 4. DailySession (일일 영업 세션)
| 컬럼명 | 타입 | 제약 | 설명 |
|--------|------|------|------|
| id | INT | PK, AUTO_INCREMENT | 세션 ID |
| food_truck_id | INT | FK(FoodTruck.id), NOT NULL | 푸드트럭 ID |
| date | DATE | NOT NULL | 영업 날짜 |
| status | ENUM('preparing', 'open', 'closed') | NOT NULL, DEFAULT 'preparing' | 영업 상태 |
| location_id | INT | FK(FavoriteLocation.id), NULL | 선택된 자주 가는 장소 |
| latitude | DECIMAL(10,7) | NULL | 실제 위치 위도 |
| longitude | DECIMAL(10,7) | NULL | 실제 위치 경도 |
| location_label | VARCHAR(255) | NULL | 위치 설명 텍스트 |
| open_time | TIME | NULL | 오픈 시간 |
| close_time | TIME | NULL | 마감 시간 |
| opened_at | DATETIME | NULL | 실제 오픈 일시 |
| created_at | DATETIME | NOT NULL | 생성일시 |
| updated_at | DATETIME | NOT NULL | 수정일시 |

---

### 5. MenuItem (메뉴 아이템)
| 컬럼명 | 타입 | 제약 | 설명 |
|--------|------|------|------|
| id | INT | PK, AUTO_INCREMENT | 메뉴 ID |
| food_truck_id | INT | FK(FoodTruck.id), NOT NULL | 푸드트럭 ID |
| name | VARCHAR(100) | NOT NULL | 메뉴 이름 |
| price | INT | NOT NULL | 가격 (원) |
| is_sold_out | BOOLEAN | NOT NULL, DEFAULT false | 품절 여부 |
| is_active | BOOLEAN | NOT NULL, DEFAULT true | 활성화 여부 |
| created_at | DATETIME | NOT NULL | 생성일시 |
| updated_at | DATETIME | NOT NULL | 수정일시 |

---

### 6. SessionMenu (세션별 메뉴 스냅샷)
> 하루 영업 세션에 포함된 메뉴 목록 (오픈 시점 스냅샷)

| 컬럼명 | 타입 | 제약 | 설명 |
|--------|------|------|------|
| id | INT | PK, AUTO_INCREMENT | ID |
| session_id | INT | FK(DailySession.id), NOT NULL | 세션 ID |
| menu_item_id | INT | FK(MenuItem.id), NOT NULL | 메뉴 ID |
| name | VARCHAR(100) | NOT NULL | 메뉴 이름 (스냅샷) |
| price | INT | NOT NULL | 가격 (스냅샷) |
| is_sold_out | BOOLEAN | NOT NULL, DEFAULT false | 품절 여부 |

---

### 7. NotificationSubscription (알림 구독)
| 컬럼명 | 타입 | 제약 | 설명 |
|--------|------|------|------|
| id | INT | PK, AUTO_INCREMENT | ID |
| food_truck_id | INT | FK(FoodTruck.id), NOT NULL | 구독할 푸드트럭 ID |
| device_token | VARCHAR(255) | NOT NULL | 알림 디바이스 토큰 |
| created_at | DATETIME | NOT NULL | 생성일시 |

---

## 관계 다이어그램 (ERD)

```
User (1) ──────────────── (N) FoodTruck
                                  │
                    ┌─────────────┼─────────────┐
                    │             │             │
              (N) FavoriteLocation  (N) DailySession   (N) MenuItem
                                        │
                                  (N) SessionMenu ─── (1) MenuItem
```

### 관계 요약
- **User → FoodTruck**: 1:N (한 사장님이 여러 푸드트럭 보유 가능)
- **FoodTruck → FavoriteLocation**: 1:N (푸드트럭마다 여러 자주 가는 장소)
- **FoodTruck → DailySession**: 1:N (날짜별 영업 세션)
- **FoodTruck → MenuItem**: 1:N (푸드트럭의 메뉴 목록)
- **DailySession → SessionMenu**: 1:N (세션별 메뉴 스냅샷)
- **MenuItem → SessionMenu**: 1:N (메뉴가 여러 세션에 포함)
- **FoodTruck → NotificationSubscription**: 1:N (손님의 알림 구독)
