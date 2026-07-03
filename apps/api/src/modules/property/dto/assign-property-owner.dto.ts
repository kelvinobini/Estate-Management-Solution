import { IsUUID } from 'class-validator';

export class AssignPropertyOwnerDto {
  @IsUUID()
  userId!: string;
}
