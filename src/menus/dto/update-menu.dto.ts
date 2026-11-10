import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateMenuDto } from './create-menu.dto.js';

export class UpdateMenuDto extends PartialType(CreateMenuDto) {
  @ApiPropertyOptional({ description: '활성화(오늘 판매) 여부' })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
