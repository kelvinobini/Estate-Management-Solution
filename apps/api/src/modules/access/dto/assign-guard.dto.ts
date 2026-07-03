import { IsUUID } from 'class-validator';

export class AssignGuardDto {
  @IsUUID()
  userId!: string;

  @IsUUID()
  propertyId!: string;
}
