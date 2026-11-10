import { ApiProperty } from '@nestjs/swagger';

export class NearbySubscribeResponseDto {
  @ApiProperty({ example: true })
  subscribed: boolean;
}

export class SubscribeResponseDto extends NearbySubscribeResponseDto {
  @ApiProperty({ example: 1 })
  food_truck_id: number;
}
