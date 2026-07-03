import { Body, Controller, Get, Param, Patch, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtClaims } from '../../../common/interfaces/authenticated-request.interface';
import { AuditLogInterceptor } from '../../compliance/interceptors/audit-log.interceptor';
import { AuditAction } from '../../compliance/decorators/audit-action.decorator';
import { RolesService } from '../services/roles.service';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRolePermissionsDto } from '../dto/update-role-permissions.dto';

@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermissions('role.manage')
  listRoles(@CurrentUser() user: JwtClaims) {
    return this.rolesService.listRoles(user.organisation_id);
  }

  @Post()
  @RequirePermissions('role.manage')
  @UseInterceptors(AuditLogInterceptor)
  @AuditAction({ action: 'role.created', entityType: 'role' })
  createRole(@CurrentUser() user: JwtClaims, @Body() dto: CreateRoleDto) {
    return this.rolesService.createRole(user.organisation_id, dto);
  }

  @Patch(':id/permissions')
  @RequirePermissions('role.manage')
  @UseInterceptors(AuditLogInterceptor)
  @AuditAction({ action: 'role.permissions_updated', entityType: 'role' })
  updateRolePermissions(
    @CurrentUser() user: JwtClaims,
    @Param('id') id: string,
    @Body() dto: UpdateRolePermissionsDto,
  ) {
    return this.rolesService.updateRolePermissions(user.organisation_id, id, dto);
  }
}
