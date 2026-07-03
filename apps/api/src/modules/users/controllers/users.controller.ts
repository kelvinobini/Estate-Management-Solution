import { Body, Controller, Get, Param, Patch, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtClaims } from '../../../common/interfaces/authenticated-request.interface';
import { AuditLogInterceptor } from '../../compliance/interceptors/audit-log.interceptor';
import { AuditAction } from '../../compliance/decorators/audit-action.decorator';
import { UsersService } from '../services/users.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserStatusDto } from '../dto/update-user-status.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @RequirePermissions('user.create')
  @UseInterceptors(AuditLogInterceptor)
  @AuditAction({ action: 'user.invited', entityType: 'user', redactFields: ['temporaryPassword'] })
  create(@CurrentUser() user: JwtClaims, @Body() dto: CreateUserDto) {
    return this.usersService.create(user.organisation_id, dto);
  }

  @Get()
  @RequirePermissions('user.read')
  list(@CurrentUser() user: JwtClaims) {
    return this.usersService.list(user.organisation_id);
  }

  /** Support endpoint for the invite form's role picker — org-scoped roles only (not the global SuperAdmin role). */
  @Get('roles')
  @RequirePermissions('role.read')
  listRoles(@CurrentUser() user: JwtClaims) {
    return this.usersService.listRoles(user.organisation_id);
  }

  @Patch(':id/status')
  @RequirePermissions('user.update')
  @UseInterceptors(AuditLogInterceptor)
  @AuditAction({ action: 'user.status_changed', entityType: 'user' })
  updateStatus(@CurrentUser() user: JwtClaims, @Param('id') id: string, @Body() dto: UpdateUserStatusDto) {
    return this.usersService.updateStatus(user.organisation_id, user.sub, id, dto.status);
  }
}
