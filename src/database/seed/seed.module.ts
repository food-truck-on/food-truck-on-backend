import { Module } from '@nestjs/common';
import { AppModule } from '../../app.module.js';
import { SeedService } from './seed.service.js';

/** 서버와 같은 엔티티·DB 설정을 쓰도록 AppModule 을 그대로 불러온다. */
@Module({
  imports: [AppModule],
  providers: [SeedService],
})
export class SeedModule {}
