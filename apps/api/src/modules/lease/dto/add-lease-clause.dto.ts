import { IsString } from 'class-validator';

export class AddLeaseClauseDto {
  @IsString()
  clauseType!: string;

  @IsString()
  clauseText!: string;
}
