import { Body, Controller, ForbiddenException, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtClaims } from '../../../common/interfaces/authenticated-request.interface';
import { VehiclesService } from '../services/vehicles.service';
import { TenantsService } from '../../lease/services/tenants.service';
import { CreateVehicleDto } from '../dto/create-vehicle.dto';

@Controller('vehicles')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class VehiclesController {
  constructor(
    private readonly vehiclesService: VehiclesService,
    private readonly tenantsService: TenantsService,
  ) {}

  /**
   * Staff may supply tenantId directly (or omit it for an unassigned/visitor
   * vehicle). Tenant-role callers always get resolved to their own tenant id
   * — otherwise a Tenant could register a vehicle under another tenant's
   * name, since tenantId was previously accepted unchecked.
   */
  @Post()
  @RequirePermissions('vehicle.create')
  async create(@CurrentUser() user: JwtClaims, @Body() dto: CreateVehicleDto) {
    if (user.role === 'Tenant') {
      const ownTenantId = await this.tenantsService.resolveOwnTenantId(user.organisation_id, user.sub);
      if (!ownTenantId) {
        throw new ForbiddenException('Your account is not linked to a tenant record yet');
      }
      return this.vehiclesService.create(user.organisation_id, { ...dto, tenantId: ownTenantId });
    }
    return this.vehiclesService.create(user.organisation_id, dto);
  }

  @Get('tenant/:tenantId')
  @RequirePermissions('vehicle.read')
  async listForTenant(@CurrentUser() user: JwtClaims, @Param('tenantId') tenantId: string) {
    await this.assertTenantCanView(user, tenantId);
    return this.vehiclesService.listForTenant(user.organisation_id, tenantId);
  }

  @Get(':id')
  @RequirePermissions('vehicle.read')
  async get(@CurrentUser() user: JwtClaims, @Param('id') id: string) {
    const vehicle = await this.vehiclesService.get(user.organisation_id, id);
    await this.assertTenantCanView(user, vehicle.tenant_id);
    return vehicle;
  }

  private async assertTenantCanView(user: JwtClaims, tenantId: string | null): Promise<void> {
    if (user.role !== 'Tenant') return;
    const ownTenantId = await this.tenantsService.resolveOwnTenantId(user.organisation_id, user.sub);
    if (!ownTenantId || ownTenantId !== tenantId) {
      throw new ForbiddenException('Tenants may only view their own vehicles');
    }
  }
}
