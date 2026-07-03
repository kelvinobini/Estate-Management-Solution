import { Body, Controller, Get, Param, Patch, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtClaims } from '../../../common/interfaces/authenticated-request.interface';
import { AuditLogInterceptor } from '../../compliance/interceptors/audit-log.interceptor';
import { AuditAction } from '../../compliance/decorators/audit-action.decorator';
import { TenantsService } from '../services/tenants.service';
import { CreateTenantDto } from '../dto/create-tenant.dto';
import { VerifyKycDto } from '../dto/verify-kyc.dto';

@Controller('tenants')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  @RequirePermissions('tenant.create')
  create(@CurrentUser() user: JwtClaims, @Body() dto: CreateTenantDto) {
    return this.tenantsService.create(user.organisation_id, dto);
  }

  @Get()
  @RequirePermissions('tenant.read')
  list(@CurrentUser() user: JwtClaims) {
    return this.tenantsService.list(user.organisation_id);
  }

  /**
   * "Who am I as a tenant" — deliberately guarded by JwtAuthGuard only, no
   * @RequirePermissions (same pattern as AuthController's MFA endpoints):
   * Tenant-role logins don't carry tenant.read, and the response is
   * inherently self-scoped (resolved from the caller's own JWT sub), so
   * there's no cross-tenant risk in leaving it open to any authenticated
   * caller. A mobile/portal client needs this to learn its own tenants.id
   * before it can call the tenant-scoped `GET .../tenant/:tenantId` routes.
   *
   * Registered before ':id' — same segment count, so registration order
   * matters or ':id' would swallow 'me' as a param value.
   */
  @Get('me')
  getOwn(@CurrentUser() user: JwtClaims) {
    return this.tenantsService.getOwn(user.organisation_id, user.sub);
  }

  @Get(':id')
  @RequirePermissions('tenant.read')
  get(@CurrentUser() user: JwtClaims, @Param('id') id: string) {
    return this.tenantsService.get(user.organisation_id, id);
  }

  @Patch(':id/kyc')
  @RequirePermissions('tenant.kyc.verify')
  @UseInterceptors(AuditLogInterceptor)
  @AuditAction({ action: 'tenant.kyc_decision_recorded', entityType: 'tenant' })
  recordKycDecision(@CurrentUser() user: JwtClaims, @Param('id') id: string, @Body() dto: VerifyKycDto) {
    return this.tenantsService.recordKycDecision(user.organisation_id, id, dto);
  }

  /** One-shot, like POST /users — see TenantsService.grantPortalAccess for why the temp password is returned directly. */
  @Post(':id/portal-access')
  @RequirePermissions('tenant.portal_access.grant')
  @UseInterceptors(AuditLogInterceptor)
  @AuditAction({ action: 'tenant.portal_access_granted', entityType: 'tenant', redactFields: ['temporaryPassword'] })
  grantPortalAccess(@CurrentUser() user: JwtClaims, @Param('id') id: string) {
    return this.tenantsService.grantPortalAccess(user.organisation_id, id);
  }
}
