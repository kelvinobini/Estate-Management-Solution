import { IsInt, Min } from 'class-validator';

export class RestockInventoryDto {
  @IsInt()
  @Min(1)
  quantity!: number;
}
