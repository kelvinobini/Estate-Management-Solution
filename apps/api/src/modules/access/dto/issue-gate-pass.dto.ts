import { IsISO8601, IsUUID } from 'class-validator';

export class IssueGatePassDto {
  @IsUUID()
  visitorId!: string;

  @IsISO8601()
  validFrom!: string;

  @IsISO8601()
  validUntil!: string;
}
