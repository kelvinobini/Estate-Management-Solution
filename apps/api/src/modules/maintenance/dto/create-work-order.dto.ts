import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateWorkOrderDto {
  /**
   * Optional: staff usually know the property directly. When omitted, the
   * controller resolves it from `unitId` instead — the path a Tenant-role
   * caller has to use, since they can't look up floor/block records to walk
   * that chain themselves.
   */
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @IsOptional()
  @IsUUID()
  unitId?: string;

  @IsOptional()
  @IsUUID()
  assetId?: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsIn(['low', 'medium', 'high', 'emergency'])
  priority?: string;
}
