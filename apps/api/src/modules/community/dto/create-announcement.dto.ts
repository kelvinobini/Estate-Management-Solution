import { ArrayNotEmpty, IsArray, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

const VALID_CHANNELS = ['email', 'sms', 'push', 'in_app'];

export class CreateAnnouncementDto {
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @IsString()
  title!: string;

  @IsString()
  body!: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsIn(VALID_CHANNELS, { each: true })
  channels?: string[];
}
