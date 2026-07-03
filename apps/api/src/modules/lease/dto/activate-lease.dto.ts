import { IsIn, IsOptional, IsString } from 'class-validator';

export class ActivateLeaseDto {
  @IsOptional()
  @IsIn(['DocuSign', 'AdobeSign', 'wet_signature'])
  esignatureProvider?: string;

  @IsOptional()
  @IsString()
  esignatureEnvelopeId?: string;
}
