import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateIncidentDto {
  @IsUUID()
  propertyId!: string;

  @IsIn(['security_breach', 'theft', 'fire', 'altercation', 'medical', 'other'])
  incidentType!: string;

  @IsOptional()
  @IsIn(['low', 'medium', 'high', 'critical'])
  severity?: string;

  @IsString()
  description!: string;

  @IsOptional()
  @IsString()
  cameraZone?: string;
}
