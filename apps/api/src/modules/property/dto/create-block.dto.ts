import { IsString } from 'class-validator';

export class CreateBlockDto {
  @IsString()
  name!: string;
}
