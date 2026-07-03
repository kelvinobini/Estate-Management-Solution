import { IsUUID } from 'class-validator';

export class CastVoteDto {
  @IsUUID()
  pollOptionId!: string;
}
