import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHelath() {
    return { status: 'health', message: 'ok' }
  }
}
