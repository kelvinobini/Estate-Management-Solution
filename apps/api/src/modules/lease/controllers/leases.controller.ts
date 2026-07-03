import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtClaims } from '../../../common/interfaces/authenticated-request.interface';
import { AuditLogInterceptor } from '../../compliance/interceptors/audit-log.interceptor';
import { AuditAction } from '../../compliance/decorators/audit-action.decorator';
import { LeasesService } from '../services/leases.service';
import { TenantsService } from '../services/tenants.service';
import { UnitsService } from '../../property/services/units.service';
import { PropertiesService } from '../../property/services/properties.service';
import { CreateLeaseDto } from '../dto/create-lease.dto';
import { ActivateLeaseDto } from '../dto/activate-lease.dto';
import { RenewLeaseDto } from '../dto/renew-lease.dto';
import { TerminateLeaseDto } from '../dto/terminate-lease.dto';
import { AddCoTenantDto } from '../dto/add-co-tenant.dto';
import { AddLeaseClauseDto } from '../dto/add-lease-clause.dto';

@Controller('leases')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LeasesController {
  constructor(
    private readonly leasesService: LeasesService,
    private readonly tenantsService: TenantsService,
    private readonly unitsService: UnitsService,
    private readonly propertiesService: PropertiesService,
  ) {}

  @Post()
  @RequirePermissions('lease.create')
  create(@CurrentUser() user: JwtClaims, @Body() dto: CreateLeaseDto) {
    return this.leasesService.create(user.organisation_id, dto);
  }

  /**
   * Org-wide, paginated lease register for staff. Tenants carry lease.read too but only to view
   * their own lease(s), so they're explicitly excluded here — a unit's full occupancy history
   * isn't theirs to see either. Landlords carry lease.read too but only see leases on units within
   * properties they own.
   */
  @Get()
  @RequirePermissions('lease.read')
  listAll(
    @CurrentUser() user: JwtClaims,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    if (user.role === 'Tenant') {
      throw new ForbiddenException('Tenants may only view their own lease');
    }
    const pagination = { status, page: page ? Number(page) : 1, pageSize: pageSize ? Number(pageSize) : 20 };
    if (user.role === 'Landlord') {
      return this.leasesService.listForOwner(user.organisation_id, user.sub, pagination);
    }
    return this.leasesService.listForOrganisation(user.organisation_id, pagination);
  }

  @Get('unit/:unitId')
  @RequirePermissions('lease.read')
  async listForUnit(@CurrentUser() user: JwtClaims, @Param('unitId') unitId: string) {
    if (user.role === 'Tenant') {
      throw new ForbiddenException("Tenants may not view a unit's full lease history");
    }
    if (user.role === 'Landlord') {
      const propertyId = await this.unitsService.resolvePropertyId(user.organisation_id, unitId);
      const owns = await this.propertiesService.isOwner(user.organisation_id, propertyId, user.sub);
      if (!owns) {
        throw new ForbiddenException("Landlords may only view lease history for units within properties they own");
      }
    }
    return this.leasesService.listForUnit(user.organisation_id, unitId);
  }

  @Get('tenant/:tenantId')
  @RequirePermissions('lease.read')
  async listForTenant(@CurrentUser() user: JwtClaims, @Param('tenantId') tenantId: string) {
    if (user.role === 'Landlord') {
      // Not scoped to owned properties (a tenant ID alone doesn't tell us which property their
      // unit belongs to without a further lease/unit walk). The Landlord app uses GET /leases
      // instead, which is ownership-scoped.
      throw new ForbiddenException('Landlords should use GET /leases to view their leases');
    }
    await this.assertTenantCanView(user, tenantId);
    return this.leasesService.listForTenant(user.organisation_id, tenantId);
  }

  @Get(':id')
  @RequirePermissions('lease.read')
  async get(@CurrentUser() user: JwtClaims, @Param('id') id: string) {
    const lease = await this.leasesService.get(user.organisation_id, id);
    await this.assertTenantCanView(user, lease.primary_tenant_id);
    await this.assertLandlordCanView(user, lease.unit_id);
    return lease;
  }

  @Patch(':id/submit-for-signature')
  @RequirePermissions('lease.create')
  submitForSignature(@CurrentUser() user: JwtClaims, @Param('id') id: string) {
    return this.leasesService.submitForSignature(user.organisation_id, id);
  }

  @Patch(':id/activate')
  @RequirePermissions('lease.activate')
  activate(@CurrentUser() user: JwtClaims, @Param('id') id: string, @Body() dto: ActivateLeaseDto) {
    return this.leasesService.activate(user.organisation_id, id, dto);
  }

  @Patch(':id/renew')
  @RequirePermissions('lease.renew')
  renew(@CurrentUser() user: JwtClaims, @Param('id') id: string, @Body() dto: RenewLeaseDto) {
    return this.leasesService.renew(user.organisation_id, id, dto);
  }

  @Patch(':id/terminate')
  @RequirePermissions('lease.terminate')
  @UseInterceptors(AuditLogInterceptor)
  @AuditAction({ action: 'lease.terminated', entityType: 'lease' })
  terminate(@CurrentUser() user: JwtClaims, @Param('id') id: string, @Body() dto: TerminateLeaseDto) {
    return this.leasesService.terminate(user.organisation_id, id, dto);
  }

  @Post(':id/co-tenants')
  @RequirePermissions('lease.co_tenant.manage')
  addCoTenant(@CurrentUser() user: JwtClaims, @Param('id') id: string, @Body() dto: AddCoTenantDto) {
    return this.leasesService.addCoTenant(user.organisation_id, id, dto);
  }

  @Get(':id/co-tenants')
  @RequirePermissions('lease.read')
  async listCoTenants(@CurrentUser() user: JwtClaims, @Param('id') id: string) {
    const lease = await this.leasesService.get(user.organisation_id, id);
    await this.assertTenantCanView(user, lease.primary_tenant_id);
    await this.assertLandlordCanView(user, lease.unit_id);
    return this.leasesService.listCoTenants(user.organisation_id, id);
  }

  @Post(':id/clauses')
  @RequirePermissions('lease.clause.manage')
  addClause(@CurrentUser() user: JwtClaims, @Param('id') id: string, @Body() dto: AddLeaseClauseDto) {
    return this.leasesService.addClause(user.organisation_id, id, dto);
  }

  @Get(':id/clauses')
  @RequirePermissions('lease.read')
  async listClauses(@CurrentUser() user: JwtClaims, @Param('id') id: string) {
    const lease = await this.leasesService.get(user.organisation_id, id);
    await this.assertTenantCanView(user, lease.primary_tenant_id);
    await this.assertLandlordCanView(user, lease.unit_id);
    return this.leasesService.listClauses(user.organisation_id, id);
  }

  /** Tenants may only ever view their own lease(s); staff roles carrying lease.read see everyone's. */
  private async assertTenantCanView(user: JwtClaims, primaryTenantId: string): Promise<void> {
    if (user.role !== 'Tenant') return;
    const ownTenantId = await this.tenantsService.resolveOwnTenantId(user.organisation_id, user.sub);
    if (!ownTenantId || ownTenantId !== primaryTenantId) {
      throw new ForbiddenException('Tenants may only view their own lease');
    }
  }

  /** Landlords may only view leases on units within properties they own. */
  private async assertLandlordCanView(user: JwtClaims, unitId: string): Promise<void> {
    if (user.role !== 'Landlord') return;
    const propertyId = await this.unitsService.resolvePropertyId(user.organisation_id, unitId);
    const owns = await this.propertiesService.isOwner(user.organisation_id, propertyId, user.sub);
    if (!owns) {
      throw new ForbiddenException('Landlords may only view leases on units within properties they own');
    }
  }
}
