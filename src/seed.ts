import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import {
  DEFAULT_SEED_CENTER,
  DEFAULT_SEED_DAYS,
} from './database/seed/seed-data.js';
import { SeedModule } from './database/seed/seed.module.js';
import { SeedService } from './database/seed/seed.service.js';

const logger = new Logger('Seed');

/** 가상 데이터 넣기: `npm run seed` / 지우기: `npm run seed:clear` (규칙: docs/SEED_DATA.md) */
async function bootstrap() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('운영 환경에서는 가상 데이터를 넣을 수 없습니다.');
  }

  const app = await NestFactory.createApplicationContext(SeedModule);
  try {
    const seedService = app.get(SeedService);
    if (process.argv.includes('--clear')) {
      const count = await seedService.clear();
      logger.log(`가상 사용자 ${count}명과 딸린 트럭·메뉴·세션을 지웠습니다.`);
      return;
    }

    const config = app.get(ConfigService);
    const center = {
      lat: readNumber(config, 'SEED_LAT', DEFAULT_SEED_CENTER.lat, -90, 90),
      lng: readNumber(config, 'SEED_LNG', DEFAULT_SEED_CENTER.lng, -180, 180),
    };
    const days = Math.floor(
      readNumber(config, 'SEED_DAYS', DEFAULT_SEED_DAYS, 1, 60),
    );

    const { truckCount, dates } = await seedService.run(center, days);
    logger.log(
      `가상 푸드트럭 ${truckCount}대를 (${center.lat}, ${center.lng}) 주변에 넣었습니다. ` +
        `세션 날짜: ${dates[0]} ~ ${dates[dates.length - 1]}`,
    );
  } finally {
    await app.close();
  }
}

function readNumber(
  config: ConfigService,
  key: string,
  defaultValue: number,
  min: number,
  max: number,
): number {
  const raw = config.get<string>(key);
  if (raw === undefined || raw === '') {
    return defaultValue;
  }
  const value = Number(raw);
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${key} 값이 올바르지 않습니다: ${raw} (${min} ~ ${max})`);
  }
  return value;
}

await bootstrap();
