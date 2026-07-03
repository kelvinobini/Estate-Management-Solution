import { IsString, MinLength } from 'class-validator';

export class BlacklistVisitorDto {
  @IsString()
  @MinLength(5)
  reason!: string;
}
