import { IsString, MinLength } from 'class-validator';

export class TerminateLeaseDto {
  @IsString()
  @MinLength(5)
  reason!: string;
}
