import { IsIn, IsISO8601, IsOptional, IsString, IsUrl, IsUUID } from 'class-validator';

export class CreateDocumentDto {
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @IsOptional()
  @IsUUID()
  unitId?: string;

  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @IsOptional()
  @IsUUID()
  leaseId?: string;

  @IsIn([
    'lease',
    'id_document',
    'fire_safety_cert',
    'elevator_inspection_cert',
    'electrical_certification',
    'epc_rating',
    'gas_safety_certificate',
    'insurance_certificate',
    'certificate_of_occupancy',
    'governors_consent',
    'other',
  ])
  documentType!: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsIn(['public', 'restricted', 'confidential'])
  accessLevel?: string;

  @IsOptional()
  @IsISO8601()
  expiryDate?: string;

  // Initial version, uploaded together with the document record — see CreateDocumentVersionDto for the fields.
  // Restricted to http(s) so a stored javascript:/data: URI can't execute when another
  // staff member clicks the link on the document detail page (it's rendered as a raw <a href>).
  @IsUrl({ require_tld: false })
  fileUrl!: string;

  @IsOptional()
  @IsString()
  fileHash?: string;
}
