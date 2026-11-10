import { ApiProperty } from '@nestjs/swagger';

export class LocationResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: '행복아파트 정문' })
  name: string;

  @ApiProperty({ example: '행복아파트 정문 앞' })
  address: string;

  @ApiProperty({ example: 37.1234567 })
  latitude: number;

  @ApiProperty({ example: 127.1234567 })
  longitude: number;
}
