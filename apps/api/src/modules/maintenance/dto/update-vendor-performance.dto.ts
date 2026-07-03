import { IsIn, IsNumber, Max, Min } from 'class-validator';

export class UpdateVendorPerformanceDto {
  @IsNumber()
  @Min(0)
  @Max(5)
  performanceScore!: number;
}

export class UpdateVendorStatusDto {
  @IsIn(['pending', 'active', 'suspended'])
  status!: string;
}
