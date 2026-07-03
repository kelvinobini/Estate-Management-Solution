import { IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateDocumentVersionDto {
  // Restricted to http(s) — see CreateDocumentDto.fileUrl for why.
  @IsUrl({ require_tld: false })
  fileUrl!: string;

  @IsOptional()
  @IsString()
  fileHash?: string;
}
