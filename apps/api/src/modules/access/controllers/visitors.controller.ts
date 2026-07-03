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
import { VisitorsService } from '../services/visitors.service';
import { GatePassesService } from '../services/gate-passes.service';
import { TenantsService } from '../../lease/services/tenants.service';
import { CreateVisitorDto } from '../dto/create-visitor.dto';
import { BlacklistVisitorDto } from '../dto/blacklist-visitor.dto';
import { IssueGatePassDto } from '../dto/issue-gate-pass.dto';

@Controller('visitors')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class VisitorsController {
  constructor(
    private readonly visitorsService: VisitorsService,
    private readonly gatePassesService: GatePassesService,
    private readonly tenantsService: TenantsService,
  ) {}

  /**
   * A Tenant caller's own tenant id always wins over any client-supplied
   * hostTenantId — otherwise a Tenant could plant a visitor record
   * attributed to a different tenant. Staff may supply hostTenantId freely
   * (or omit it for a walk-in/service visitor with no specific host).
   */
  @Post()
  @RequirePermissions('visitor.create')
  async create(@CurrentUser() user: JwtClaims, @Body() dto: CreateVisitorDto) {
    if (user.role === 'Tenant') {
      const ownTenantId = await this.tenantsService.resolveOwnTenantId(user.organisation_id, user.sub);
      if (!ownTenantId) {
        throw new ForbiddenException('Your account is not linked to a tenant record yet');
      }
      return this.visitorsService.create(user.organisation_id, { ...dto, hostTenantId: ownTenantId });
    }
    return this.visitorsService.create(user.organisation_id, dto);
  }

  /** Org-wide, paginated visitor register for staff. Tenants carry visitor.read too but only to view their own guests, so they're explicitly excluded here. */
  @Get()
  @RequirePermissions('visitor.read')
  listAll(@CurrentUser() user: JwtClaims, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    if (user.role === 'Tenant') {
      throw new ForbiddenException('Tenants may only view visitors they hosted');
    }
    return this.visitorsService.listForOrganisation(user.organisation_id, {
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
    });
  }

  @Get('host/:hostTenantId')
  @RequirePermissions('visitor.read')
  async listForHostTenant(@CurrentUser() user: JwtClaims, @Param('hostTenantId') hostTenantId: string) {
    await this.assertTenantCanView(user, hostTenantId);
    return this.visitorsService.listForHostTenant(user.organisation_id, hostTenantId);
  }

  @Get(':id')
  @RequirePermissions('visitor.read')
  async get(@CurrentUser() user: JwtClaims, @Param('id') id: string) {
    const visitor = await this.visitorsService.get(user.organisation_id, id);
    await this.assertTenantCanView(user, visitor.host_tenant_id);
    return visitor;
  }

  @Patch(':id/blacklist')
  @RequirePermissions('visitor.blacklist')
  @UseInterceptors(AuditLogInterceptor)
  @AuditAction({ action: 'visitor.blacklisted', entityType: 'visitor' })
  blacklist(@CurrentUser() user: JwtClaims, @Param('id') id: string, @Body() dto: BlacklistVisitorDto) {
    return this.visitorsService.blacklist(user.organisation_id, id, dto);
  }

  @Patch(':id/unblacklist')
  @RequirePermissions('visitor.blacklist')
  unblacklist(@CurrentUser() user: JwtClaims, @Param('id') id: string) {
    return this.visitorsService.unblacklist(user.organisation_id, id);
  }

  @Post(':id/gate-passes')
  @RequirePermissions('gate_pass.issue')
  async issueGatePass(
    @CurrentUser() user: JwtClaims,
    @Param('id') visitorId: string,
    @Body() dto: Omit<IssueGatePassDto, 'visitorId'>,
  ) {
    const visitor = await this.visitorsService.get(user.organisation_id, visitorId);
    await this.assertTenantCanView(user, visitor.host_tenant_id);
    return this.gatePassesService.issue(user.organisation_id, { ...dto, visitorId });
  }

  @Get(':id/gate-passes')
  @RequirePermissions('gate_pass.read')
  async listGatePasses(@CurrentUser() user: JwtClaims, @Param('id') visitorId: string) {
    const visitor = await this.visitorsService.get(user.organisation_id, visitorId);
    await this.assertTenantCanView(user, visitor.host_tenant_id);
    return this.gatePassesService.listForVisitor(user.organisation_id, visitorId);
  }

  /** Tenants may only ever view visitors they hosted; staff roles carrying visitor.read see everyone's. */
  private async assertTenantCanView(user: JwtClaims, hostTenantId: string | null): Promise<void> {
    if (user.role !== 'Tenant') return;
    const ownTenantId = await this.tenantsService.resolveOwnTenantId(user.organisation_id, user.sub);
    if (!ownTenantId || ownTenantId !== hostTenantId) {
      throw new ForbiddenException('Tenants may only view visitors they hosted');
    }
  }
}
