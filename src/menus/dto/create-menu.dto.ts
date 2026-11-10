import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, MaxLength, Min } from 'class-validator';

export class CreateMenuDto {
  @ApiProperty({ example: '타코야끼 8알', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: '가격 (원)', example: 5000, minimum: 0 })
  @IsInt()
  @Min(0)
  price: number;
}
