import { BadRequestException, Body, Controller, ForbiddenException, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtClaims } from '../../../common/interfaces/authenticated-request.interface';
import { ComplaintsService } from '../services/complaints.service';
import { TenantsService } from '../../lease/services/tenants.service';
import { CreateComplaintDto } from '../dto/create-complaint.dto';
import { UpdateComplaintStatusDto } from '../dto/update-complaint-status.dto';

@Controller('complaints')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ComplaintsController {
  constructor(
    private readonly complaintsService: ComplaintsService,
    private readonly tenantsService: TenantsService,
  ) {}

  /**
   * Staff (front-desk/community roles) file complaints on a tenant's behalf
   * and must supply `tenantId` explicitly. Tenant-role callers instead get
   * resolved to their own tenant id — see resolveTenantId.
   */
  @Post()
  @RequirePermissions('complaint.create')
  async create(@CurrentUser() user: JwtClaims, @Body() dto: CreateComplaintDto) {
    const tenantId = await this.resolveTenantId(user, dto.tenantId);
    return this.complaintsService.create(user.organisation_id, tenantId, dto);
  }

  /** Org-wide, optionally status-filtered complaint register — staff only, since complaints are tenant-private. */
  @Get()
  @RequirePermissions('complaint.read')
  listAll(
    @CurrentUser() user: JwtClaims,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    if (user.role === 'Tenant') {
      throw new ForbiddenException('Tenants may only view their own complaints');
    }
    return this.complaintsService.listForOrganisation(user.organisation_id, status, {
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
    });
  }

  @Get('overdue')
  @RequirePermissions('complaint.update')
  listOverdue(@CurrentUser() user: JwtClaims) {
    return this.complaintsService.listOverdue(user.organisation_id);
  }

  @Get('tenant/:tenantId')
  @RequirePermissions('complaint.read')
  async listForTenant(@CurrentUser() user: JwtClaims, @Param('tenantId') tenantId: string) {
    await this.assertTenantCanView(user, tenantId);
    return this.complaintsService.listForTenant(user.organisation_id, tenantId);
  }

  @Get(':id')
  @RequirePermissions('complaint.read')
  async get(@CurrentUser() user: JwtClaims, @Param('id') id: string) {
    const complaint = await this.complaintsService.get(user.organisation_id, id);
    await this.assertTenantCanView(user, complaint.tenant_id);
    return complaint;
  }

  @Patch(':id/status')
  @RequirePermissions('complaint.update')
  updateStatus(@CurrentUser() user: JwtClaims, @Param('id') id: string, @Body() dto: UpdateComplaintStatusDto) {
    return this.complaintsService.updateStatus(user.organisation_id, id, dto);
  }

  private async assertTenantCanView(user: JwtClaims, tenantId: string): Promise<void> {
    if (user.role !== 'Tenant') return;
    const ownTenantId = await this.tenantsService.resolveOwnTenantId(user.organisation_id, user.sub);
    if (!ownTenantId || ownTenantId !== tenantId) {
      throw new ForbiddenException('Tenants may only view their own complaints');
    }
  }

  /** Resolves the effective tenantId for a create call: staff must supply one, Tenant callers are resolved from their own login. */
  private async resolveTenantId(user: JwtClaims, suppliedTenantId?: string): Promise<string> {
    if (user.role !== 'Tenant') {
      if (!suppliedTenantId) {
        throw new BadRequestException('tenantId is required');
      }
      return suppliedTenantId;
    }
    const ownTenantId = await this.tenantsService.resolveOwnTenantId(user.organisation_id, user.sub);
    if (!ownTenantId) {
      throw new ForbiddenException('Your account is not linked to a tenant record yet');
    }
    if (suppliedTenantId && suppliedTenantId !== ownTenantId) {
      throw new ForbiddenException('Tenants may not file complaints on behalf of another tenant');
    }
    return ownTenantId;
  }
}
