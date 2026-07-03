import { IsIn } from 'class-validator';

export class UpdateAssetStatusDto {
  @IsIn(['operational', 'faulty', 'decommissioned'])
  status!: string;
}
