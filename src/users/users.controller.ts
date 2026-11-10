import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import {
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { User } from './entities/user.entity.js';
import { UsersService } from './users.service.js';
import { ErrorResponseDto } from '../common/dto/error-response.dto.js';

@ApiTags('인증 (Auth)')
@Controller('users')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: '인증 토큰 없음 또는 만료',
  type: ErrorResponseDto,
})
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({
    summary: '회원 탈퇴. 보유한 푸드트럭·세션·메뉴가 함께 삭제된다.',
  })
  @ApiNoContentResponse()
  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  withdraw(@CurrentUser() user: User): Promise<void> {
    return this.usersService.withdraw(user.id);
  }
}
