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
import { InvoicesService } from '../services/invoices.service';
import { TenantsService } from '../../lease/services/tenants.service';
import { UnitsService } from '../../property/services/units.service';
import { PropertiesService } from '../../property/services/properties.service';
import { CreateInvoiceDto } from '../dto/create-invoice.dto';

@Controller('invoices')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InvoicesController {
  constructor(
    private readonly invoicesService: InvoicesService,
    private readonly tenantsService: TenantsService,
    private readonly unitsService: UnitsService,
    private readonly propertiesService: PropertiesService,
  ) {}

  @Post()
  @RequirePermissions('invoice.create')
  create(@CurrentUser() user: JwtClaims, @Body() dto: CreateInvoiceDto) {
    return this.invoicesService.createInvoice(user.organisation_id, dto);
  }

  @Patch(':id/issue')
  @RequirePermissions('invoice.issue')
  issue(@CurrentUser() user: JwtClaims, @Param('id') id: string) {
    return this.invoicesService.issueInvoice(user.organisation_id, id);
  }

  @Patch(':id/void')
  @RequirePermissions('invoice.void')
  @UseInterceptors(AuditLogInterceptor)
  @AuditAction({ action: 'invoice.voided', entityType: 'invoice' })
  void(@CurrentUser() user: JwtClaims, @Param('id') id: string) {
    return this.invoicesService.voidInvoice(user.organisation_id, id);
  }

  /**
   * Org-wide, paginated invoice register for staff. Tenants carry invoice.read too but only to view
   * their own invoices via the routes below, so they're explicitly excluded here. Landlords carry
   * invoice.read too but only see invoices tied to units within properties they own.
   */
  @Get()
  @RequirePermissions('invoice.read')
  listAll(
    @CurrentUser() user: JwtClaims,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    if (user.role === 'Tenant') {
      throw new ForbiddenException('Tenants may only view their own invoices');
    }
    const pagination = { status, page: page ? Number(page) : 1, pageSize: pageSize ? Number(pageSize) : 20 };
    if (user.role === 'Landlord') {
      return this.invoicesService.listForOwner(user.organisation_id, user.sub, pagination);
    }
    return this.invoicesService.listForOrganisation(user.organisation_id, pagination);
  }

  // Registered before the ':id' route below: Express/Nest match routes in
  // registration order, so 'tenant/:tenantId' must come first or a request to
  // /invoices/tenant/<id> would be swallowed by ':id' (with id='tenant').
  @Get('tenant/:tenantId')
  @RequirePermissions('invoice.read')
  async list(@CurrentUser() user: JwtClaims, @Param('tenantId') tenantId: string) {
    if (user.role === 'Landlord') {
      // Not scoped to owned properties (invoices.tenant_id doesn't tell us which
      // property the tenant's unit belongs to without a further lease/unit walk).
      // The Landlord app uses GET /invoices instead, which is ownership-scoped.
      throw new ForbiddenException('Landlords should use GET /invoices to view their invoices');
    }
    await this.assertTenantCanView(user, tenantId);
    return this.invoicesService.listForTenant(user.organisation_id, tenantId);
  }

  @Get(':id')
  @RequirePermissions('invoice.read')
  async get(@CurrentUser() user: JwtClaims, @Param('id') id: string) {
    const invoice = await this.invoicesService.getInvoice(user.organisation_id, id);
    await this.assertTenantCanView(user, invoice.tenant_id);
    await this.assertLandlordCanView(user, invoice.unit_id);
    return invoice;
  }

  /** Tenants may only ever view their own invoices; staff roles carrying invoice.read see everyone's. */
  private async assertTenantCanView(user: JwtClaims, tenantId: string | null): Promise<void> {
    if (user.role !== 'Tenant') return;
    const ownTenantId = await this.tenantsService.resolveOwnTenantId(user.organisation_id, user.sub);
    if (!ownTenantId || ownTenantId !== tenantId) {
      throw new ForbiddenException('Tenants may only view their own invoices');
    }
  }

  /** Landlords may only view invoices tied to a unit within a property they own. An unassigned unit_id can't be attributed to any property, so it's denied. */
  private async assertLandlordCanView(user: JwtClaims, unitId: string | null): Promise<void> {
    if (user.role !== 'Landlord') return;
    if (!unitId) {
      throw new ForbiddenException('Landlords may only view invoices tied to a unit within a property they own');
    }
    const propertyId = await this.unitsService.resolvePropertyId(user.organisation_id, unitId);
    const owns = await this.propertiesService.isOwner(user.organisation_id, propertyId, user.sub);
    if (!owns) {
      throw new ForbiddenException('Landlords may only view invoices tied to a unit within a property they own');
    }
  }
}
