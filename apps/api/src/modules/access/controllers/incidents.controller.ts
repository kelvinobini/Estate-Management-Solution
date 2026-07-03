import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtClaims } from '../../../common/interfaces/authenticated-request.interface';
import { IncidentsService } from '../services/incidents.service';
import { GuardsService } from '../services/guards.service';
import { CreateIncidentDto } from '../dto/create-incident.dto';
import { UpdateIncidentStatusDto } from '../dto/update-incident-status.dto';

@Controller('incidents')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class IncidentsController {
  constructor(
    private readonly incidentsService: IncidentsService,
    private readonly guardsService: GuardsService,
  ) {}

  /**
   * A SecurityGuard caller's own assigned property always wins over any
   * client-supplied propertyId — otherwise a guard could attribute an
   * incident to a property they don't work at. Mirrors the same
   * caller-identity-overrides-client-input pattern used for Tenant callers
   * in VisitorsController.
   */
  @Post()
  @RequirePermissions('incident.create')
  async create(@CurrentUser() user: JwtClaims, @Body() dto: CreateIncidentDto) {
    if (user.role === 'SecurityGuard') {
      const ownPropertyId = await this.guardsService.resolveOwnPropertyId(user.organisation_id, user.sub);
      if (!ownPropertyId) {
        throw new BadRequestException('Your account is not assigned to a property yet');
      }
      return this.incidentsService.create(user.organisation_id, user.sub, { ...dto, propertyId: ownPropertyId });
    }
    return this.incidentsService.create(user.organisation_id, user.sub, dto);
  }

  /** Org-wide security log for staff. */
  @Get()
  @RequirePermissions('incident.read')
  listAll(
    @CurrentUser() user: JwtClaims,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.incidentsService.listForOrganisation(user.organisation_id, status, {
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
    });
  }

  @Get('property/:propertyId')
  @RequirePermissions('incident.read')
  listForProperty(@CurrentUser() user: JwtClaims, @Param('propertyId') propertyId: string) {
    return this.incidentsService.listForProperty(user.organisation_id, propertyId);
  }

  @Get(':id')
  @RequirePermissions('incident.read')
  get(@CurrentUser() user: JwtClaims, @Param('id') id: string) {
    return this.incidentsService.get(user.organisation_id, id);
  }

  @Patch(':id/status')
  @RequirePermissions('incident.update')
  updateStatus(@CurrentUser() user: JwtClaims, @Param('id') id: string, @Body() dto: UpdateIncidentStatusDto) {
    return this.incidentsService.updateStatus(user.organisation_id, id, dto);
  }
}
