import { ArrayMinSize, IsString } from 'class-validator';

export class UpdateRolePermissionsDto {
  @IsString({ each: true })
  @ArrayMinSize(1, { message: 'A role needs at least one permission' })
  permissionCodes!: string[];
}
