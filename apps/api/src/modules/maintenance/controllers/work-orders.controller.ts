import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtClaims } from '../../../common/interfaces/authenticated-request.interface';
import { WorkOrdersService } from '../services/work-orders.service';
import { UnitsService } from '../../property/services/units.service';
import { PropertiesService } from '../../property/services/properties.service';
import { LeasesService } from '../../lease/services/leases.service';
import { TenantsService } from '../../lease/services/tenants.service';
import { CreateWorkOrderDto } from '../dto/create-work-order.dto';
import { AssignWorkOrderDto } from '../dto/assign-work-order.dto';
import { UpdateWorkOrderStatusDto } from '../dto/update-work-order-status.dto';
import { AddWorkOrderPartDto } from '../dto/add-work-order-part.dto';

const VALID_WORK_ORDER_STATUSES = ['open', 'assigned', 'in_progress', 'on_hold', 'closed', 'cancelled'];

@Controller('work-orders')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class WorkOrdersController {
  constructor(
    private readonly workOrdersService: WorkOrdersService,
    private readonly unitsService: UnitsService,
    private readonly propertiesService: PropertiesService,
    private readonly leasesService: LeasesService,
    private readonly tenantsService: TenantsService,
  ) {}

  /**
   * Staff supply `propertyId` directly. Tenant-role callers can't (no
   * floor.read/block.read to walk unit -> floor -> block themselves), so for
   * them `unitId` is required instead, verified against their own lease and
   * resolved to a property server-side.
   */
  @Post()
  @RequirePermissions('work_order.create')
  async create(@CurrentUser() user: JwtClaims, @Body() dto: CreateWorkOrderDto) {
    let propertyId = dto.propertyId;

    if (user.role === 'Tenant') {
      if (!dto.unitId) {
        throw new BadRequestException('unitId is required');
      }
      const ownTenantId = await this.tenantsService.resolveOwnTenantId(user.organisation_id, user.sub);
      if (!ownTenantId) {
        throw new ForbiddenException('Your account is not linked to a tenant record yet');
      }
      const leases = await this.leasesService.listForTenant(user.organisation_id, ownTenantId);
      if (!leases.some((lease) => lease.unit_id === dto.unitId)) {
        throw new ForbiddenException('You may only raise work orders for a unit on your own lease');
      }
    }

    if (!propertyId) {
      if (!dto.unitId) {
        throw new BadRequestException('propertyId or unitId is required');
      }
      propertyId = await this.unitsService.resolvePropertyId(user.organisation_id, dto.unitId);
    }

    return this.workOrdersService.create(user.organisation_id, user.sub, propertyId, dto);
  }

  /** Property-wide work order history is staff-only — it isn't scoped to a single reporter. Landlords are further scoped to properties they own. */
  @Get('property/:propertyId')
  @RequirePermissions('work_order.read')
  async listForProperty(@CurrentUser() user: JwtClaims, @Param('propertyId') propertyId: string) {
    if (user.role === 'Tenant') {
      throw new ForbiddenException('Tenants may only view work orders they raised');
    }
    if (user.role === 'Landlord') {
      const owns = await this.propertiesService.isOwner(user.organisation_id, propertyId, user.sub);
      if (!owns) {
        throw new ForbiddenException('Landlords may only view work orders for properties they own');
      }
    }
    return this.workOrdersService.listForProperty(user.organisation_id, propertyId);
  }

  /**
   * Tenants carry work_order.read too, but only ever see work orders they personally raised.
   * Landlords carry work_order.read too, but only see work orders for properties they own.
   * MaintenanceStaff carry work_order.read too, but only see jobs assigned to them.
   * Everyone else sees the org-wide list.
   */
  @Get()
  @RequirePermissions('work_order.read')
  async listByStatus(
    @CurrentUser() user: JwtClaims,
    @Query('status') status: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    if (!VALID_WORK_ORDER_STATUSES.includes(status)) {
      throw new BadRequestException(`status must be one of: ${VALID_WORK_ORDER_STATUSES.join(', ')}`);
    }
    const filters: { raisedByUserId?: string; assignedUserId?: string; propertyIds?: string[] } = {};
    if (user.role === 'Tenant') filters.raisedByUserId = user.sub;
    if (user.role === 'MaintenanceStaff') filters.assignedUserId = user.sub;
    if (user.role === 'Landlord') filters.propertyIds = await this.propertiesService.resolveOwnedPropertyIds(user.organisation_id, user.sub);
    return this.workOrdersService.listByStatus(user.organisation_id, status, filters, {
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
    });
  }

  @Get(':id')
  @RequirePermissions('work_order.read')
  async get(@CurrentUser() user: JwtClaims, @Param('id') id: string) {
    const workOrder = await this.workOrdersService.get(user.organisation_id, id);
    if (user.role === 'Tenant' && workOrder.raised_by_user_id !== user.sub) {
      throw new ForbiddenException('Tenants may only view work orders they raised');
    }
    if (user.role === 'Landlord') {
      const owns = await this.propertiesService.isOwner(user.organisation_id, workOrder.property_id, user.sub);
      if (!owns) {
        throw new ForbiddenException('Landlords may only view work orders for properties they own');
      }
    }
    if (user.role === 'MaintenanceStaff' && workOrder.assigned_user_id !== user.sub) {
      throw new ForbiddenException('MaintenanceStaff may only view work orders assigned to them');
    }
    return workOrder;
  }

  @Patch(':id/assign')
  @RequirePermissions('work_order.assign')
  assign(@CurrentUser() user: JwtClaims, @Param('id') id: string, @Body() dto: AssignWorkOrderDto) {
    return this.workOrdersService.assign(user.organisation_id, id, dto);
  }

  @Patch(':id/status')
  @RequirePermissions('work_order.update')
  async updateStatus(@CurrentUser() user: JwtClaims, @Param('id') id: string, @Body() dto: UpdateWorkOrderStatusDto) {
    if (user.role === 'MaintenanceStaff') {
      const workOrder = await this.workOrdersService.get(user.organisation_id, id);
      if (workOrder.assigned_user_id !== user.sub) {
        throw new ForbiddenException('MaintenanceStaff may only update work orders assigned to them');
      }
    }
    return this.workOrdersService.updateStatus(user.organisation_id, id, dto.status);
  }

  @Post(':id/parts')
  @RequirePermissions('work_order.parts.manage')
  async addPart(@CurrentUser() user: JwtClaims, @Param('id') id: string, @Body() dto: AddWorkOrderPartDto) {
    if (user.role === 'MaintenanceStaff') {
      const workOrder = await this.workOrdersService.get(user.organisation_id, id);
      if (workOrder.assigned_user_id !== user.sub) {
        throw new ForbiddenException('MaintenanceStaff may only log parts for work orders assigned to them');
      }
    }
    return this.workOrdersService.addPart(user.organisation_id, id, dto);
  }

  @Get(':id/parts')
  @RequirePermissions('work_order.read')
  async listParts(@CurrentUser() user: JwtClaims, @Param('id') id: string) {
    const workOrder = await this.workOrdersService.get(user.organisation_id, id);
    if (user.role === 'Tenant' && workOrder.raised_by_user_id !== user.sub) {
      throw new ForbiddenException('Tenants may only view work orders they raised');
    }
    if (user.role === 'Landlord') {
      const owns = await this.propertiesService.isOwner(user.organisation_id, workOrder.property_id, user.sub);
      if (!owns) {
        throw new ForbiddenException('Landlords may only view work orders for properties they own');
      }
    }
    if (user.role === 'MaintenanceStaff' && workOrder.assigned_user_id !== user.sub) {
      throw new ForbiddenException('MaintenanceStaff may only view work orders assigned to them');
    }
    return this.workOrdersService.listParts(user.organisation_id, id);
  }
}
