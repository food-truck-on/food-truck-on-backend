import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        // Supabase(PostgreSQL) 연결 문자열
        url: configService.getOrThrow<string>('DB_URL'),
        // Supabase 는 SSL 연결이 필요하다. 로컬 PostgreSQL 을 쓸 때만 DB_SSL=false 로 끈다.
        ssl:
          configService.get('DB_SSL') === 'false'
            ? false
            : { rejectUnauthorized: false },
        autoLoadEntities: true,
        // 개발 편의용 스키마 자동 동기화. 운영에서는 반드시 false 로 두고 마이그레이션을 사용한다.
        synchronize: configService.get('DB_SYNCHRONIZE') === 'true',
      }),
    }),
  ],
})
export class DatabaseModule {}
