import { IsInt, IsNumberString, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateAmenityDto {
  @IsUUID()
  propertyId!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsNumberString()
  bookingFeeKobo?: string;
}
