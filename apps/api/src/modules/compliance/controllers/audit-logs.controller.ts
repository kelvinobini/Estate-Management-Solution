import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtClaims } from '../../../common/interfaces/authenticated-request.interface';
import { AuditLogsService } from '../services/audit-logs.service';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('audit_log.read')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  list(@CurrentUser() user: JwtClaims, @Query('limit') limit?: string) {
    return this.auditLogsService.listForOrganisation(user.organisation_id, limit ? Number(limit) : undefined);
  }

  @Get(':entityType/:entityId')
  listForEntity(@CurrentUser() user: JwtClaims, @Param('entityType') entityType: string, @Param('entityId') entityId: string) {
    return this.auditLogsService.listForEntity(user.organisation_id, entityType, entityId);
  }
}
