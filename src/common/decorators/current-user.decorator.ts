import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** JwtAuthGuard 가 request.user 에 넣어둔 로그인 사용자를 꺼낸다. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest().user,
);
