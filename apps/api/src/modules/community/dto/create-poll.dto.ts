import { Type } from 'class-transformer';
import { ArrayMinSize, IsISO8601, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';

class PollOptionInputDto {
  @IsString()
  optionText!: string;
}

export class CreatePollDto {
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @IsString()
  question!: string;

  @IsISO8601()
  opensAt!: string;

  @IsISO8601()
  closesAt!: string;

  @ValidateNested({ each: true })
  @Type(() => PollOptionInputDto)
  @ArrayMinSize(2, { message: 'A poll needs at least 2 options' })
  options!: PollOptionInputDto[];
}
