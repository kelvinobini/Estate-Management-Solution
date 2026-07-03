import { IsIn, IsNumberString, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateMeterDto {
  @IsUUID()
  propertyId!: string;

  /** Omit for a bulk/property-level meter — is_bulk_meter is derived from this, not a separate flag, to keep the two from disagreeing. */
  @IsOptional()
  @IsUUID()
  unitId?: string;

  @IsIn(['electricity', 'water', 'gas', 'generator_diesel'])
  meterType!: string;

  @IsString()
  serialNumber!: string;

  @IsOptional()
  @IsNumberString()
  unitRateKobo?: string;
}
