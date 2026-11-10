import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { User } from '../users/entities/user.entity.js';
import { SetSessionLocationDto } from './dto/set-session-location.dto.js';
import { SessionsService } from './sessions.service.js';
import { ErrorResponseDto } from '../common/dto/error-response.dto.js';
import {
  CloseSessionResponseDto,
  ImportMenusResponseDto,
  OpenSessionResponseDto,
  SessionLocationResponseDto,
  TodaySessionResponseDto,
} from './dto/session-response.dto.js';

@ApiTags('영업 세션 (Session)')
@Controller()
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: '인증 토큰 없음 또는 만료',
  type: ErrorResponseDto,
})
@UseGuards(JwtAuthGuard)
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @ApiOperation({
    summary: '오늘 세션 조회. 없으면 preparing 상태로 생성한다.',
  })
  @ApiOkResponse({ type: TodaySessionResponseDto })
  @Get('food-trucks/:foodTruckId/sessions/today')
  getOrCreateToday(
    @Param('foodTruckId', ParseIntPipe) foodTruckId: number,
    @CurrentUser() user: User,
  ): Promise<TodaySessionResponseDto> {
    return this.sessionsService.getOrCreateToday(foodTruckId, user.id);
  }

  @ApiOperation({
    summary:
      '오늘 세션 위치 설정. location_id 만 보내면 해당 장소의 좌표·주소로 채워진다.',
  })
  @ApiOkResponse({ type: SessionLocationResponseDto })
  @Patch('sessions/:sessionId/location')
  setLocation(
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @CurrentUser() user: User,
    @Body() dto: SetSessionLocationDto,
  ): Promise<SessionLocationResponseDto> {
    return this.sessionsService.setLocation(sessionId, user.id, dto);
  }

  @ApiOperation({
    summary: '오픈하기. 위치와 메뉴가 모두 설정된 경우에만 가능 (아니면 400)',
  })
  @ApiOkResponse({ type: OpenSessionResponseDto })
  @Post('sessions/:sessionId/open')
  @HttpCode(HttpStatus.OK)
  open(
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @CurrentUser() user: User,
  ): Promise<OpenSessionResponseDto> {
    return this.sessionsService.open(sessionId, user.id);
  }

  @ApiOperation({ summary: '영업 종료' })
  @ApiOkResponse({ type: CloseSessionResponseDto })
  @Post('sessions/:sessionId/close')
  @HttpCode(HttpStatus.OK)
  close(
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @CurrentUser() user: User,
  ): Promise<CloseSessionResponseDto> {
    return this.sessionsService.close(sessionId, user.id);
  }

  @ApiOperation({
    summary:
      '어제 메뉴 불러오기. 가장 최근 영업한 세션의 메뉴 구성으로 활성 메뉴를 맞춘다.',
  })
  @ApiOkResponse({ type: ImportMenusResponseDto })
  @Post('sessions/:sessionId/menus/import-yesterday')
  @HttpCode(HttpStatus.OK)
  importYesterdayMenus(
    @Param('sessionId', ParseIntPipe) sessionId: number,
    @CurrentUser() user: User,
  ): Promise<ImportMenusResponseDto> {
    return this.sessionsService.importYesterdayMenus(sessionId, user.id);
  }
}
