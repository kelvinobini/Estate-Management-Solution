import { BadRequestException, Body, Controller, ForbiddenException, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtClaims } from '../../../common/interfaces/authenticated-request.interface';
import { BookingsService } from '../services/bookings.service';
import { TenantsService } from '../../lease/services/tenants.service';
import { CreateBookingDto } from '../dto/create-booking.dto';

@Controller('bookings')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BookingsController {
  constructor(
    private readonly bookingsService: BookingsService,
    private readonly tenantsService: TenantsService,
  ) {}

  /**
   * Staff book amenities on a tenant's behalf and must supply `tenantId`
   * explicitly. Tenant-role callers instead get resolved to their own
   * tenant id — see resolveTenantId.
   */
  @Post()
  @RequirePermissions('booking.create')
  async create(@CurrentUser() user: JwtClaims, @Body() dto: CreateBookingDto) {
    const tenantId = await this.resolveTenantId(user, dto.tenantId);
    return this.bookingsService.create(user.organisation_id, tenantId, dto);
  }

  @Get('tenant/:tenantId')
  @RequirePermissions('booking.read')
  async listForTenant(@CurrentUser() user: JwtClaims, @Param('tenantId') tenantId: string) {
    await this.assertTenantCanView(user, tenantId);
    return this.bookingsService.listForTenant(user.organisation_id, tenantId);
  }

  /** Per-amenity booking calendar — staff-only, since it spans every tenant's bookings for that amenity. */
  @Get('amenity/:amenityId')
  @RequirePermissions('booking.read')
  listForAmenity(@CurrentUser() user: JwtClaims, @Param('amenityId') amenityId: string) {
    if (user.role === 'Tenant') {
      throw new ForbiddenException('Tenants may only view their own bookings');
    }
    return this.bookingsService.listForAmenity(user.organisation_id, amenityId);
  }

  @Get(':id')
  @RequirePermissions('booking.read')
  async get(@CurrentUser() user: JwtClaims, @Param('id') id: string) {
    const booking = await this.bookingsService.get(user.organisation_id, id);
    await this.assertTenantCanView(user, booking.tenant_id);
    return booking;
  }

  @Patch(':id/cancel')
  @RequirePermissions('booking.cancel')
  async cancel(@CurrentUser() user: JwtClaims, @Param('id') id: string) {
    const booking = await this.bookingsService.get(user.organisation_id, id);
    await this.assertTenantCanView(user, booking.tenant_id);
    return this.bookingsService.cancel(user.organisation_id, id);
  }

  private async assertTenantCanView(user: JwtClaims, tenantId: string): Promise<void> {
    if (user.role !== 'Tenant') return;
    const ownTenantId = await this.tenantsService.resolveOwnTenantId(user.organisation_id, user.sub);
    if (!ownTenantId || ownTenantId !== tenantId) {
      throw new ForbiddenException('Tenants may only view their own bookings');
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
      throw new ForbiddenException('Tenants may not book amenities on behalf of another tenant');
    }
    return ownTenantId;
  }
}
