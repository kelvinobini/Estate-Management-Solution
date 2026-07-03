import { IsEmail, IsOptional, IsString } from 'class-validator';

export class CreateUserDto {
  @IsString()
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  /** Must match an existing role name for this organisation — see GET /users/roles. */
  @IsString()
  roleName!: string;
}
