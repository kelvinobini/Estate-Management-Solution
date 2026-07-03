import { IsInt, IsUUID, Min } from 'class-validator';

export class AddWorkOrderPartDto {
  @IsUUID()
  inventoryItemId!: string;

  @IsInt()
  @Min(1)
  quantityUsed!: number;
}
