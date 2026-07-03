import { Body, Controller, Delete, ForbiddenException, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtClaims } from '../../../common/interfaces/authenticated-request.interface';
import { PropertiesService } from '../services/properties.service';
import { CreatePropertyDto } from '../dto/create-property.dto';
import { UpdatePropertyDto } from '../dto/update-property.dto';
import { CreateValuationDto } from '../dto/create-valuation.dto';
import { AssignPropertyOwnerDto } from '../dto/assign-property-owner.dto';

@Controller('properties')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Post()
  @RequirePermissions('property.create')
  create(@CurrentUser() user: JwtClaims, @Body() dto: CreatePropertyDto) {
    return this.propertiesService.create(user.organisation_id, dto);
  }

  /** Landlord-role callers see only their own portfolio (via property_owners); every other role carrying property.read sees the whole org. */
  @Get()
  @RequirePermissions('property.read')
  list(@CurrentUser() user: JwtClaims) {
    if (user.role === 'Landlord') {
      return this.propertiesService.listOwned(user.organisation_id, user.sub);
    }
    return this.propertiesService.list(user.organisation_id);
  }

  @Get(':id')
  @RequirePermissions('property.read')
  async get(@CurrentUser() user: JwtClaims, @Param('id') id: string) {
    const property = await this.propertiesService.get(user.organisation_id, id);
    if (user.role === 'Landlord') {
      const owns = await this.propertiesService.isOwner(user.organisation_id, id, user.sub);
      if (!owns) {
        throw new ForbiddenException('Landlords may only view properties they own');
      }
    }
    return property;
  }

  /** Links an existing (usually Landlord-role) user to a property. Staff-only — see seed.ts for the property.owner.assign grant. */
  @Post(':id/owners')
  @RequirePermissions('property.owner.assign')
  async assignOwner(@CurrentUser() user: JwtClaims, @Param('id') id: string, @Body() dto: AssignPropertyOwnerDto) {
    await this.propertiesService.assignOwner(user.organisation_id, id, dto.userId);
    return { propertyId: id, userId: dto.userId };
  }

  /** Staff-facing "who owns this property" list — same gate as assigning, since it's the same admin surface. */
  @Get(':id/owners')
  @RequirePermissions('property.owner.assign')
  listOwners(@CurrentUser() user: JwtClaims, @Param('id') id: string) {
    return this.propertiesService.listOwners(user.organisation_id, id);
  }

  @Patch(':id')
  @RequirePermissions('property.update')
  update(@CurrentUser() user: JwtClaims, @Param('id') id: string, @Body() dto: UpdatePropertyDto) {
    return this.propertiesService.update(user.organisation_id, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions('property.delete')
  async remove(@CurrentUser() user: JwtClaims, @Param('id') id: string) {
    await this.propertiesService.remove(user.organisation_id, id);
  }

  @Post(':id/valuations')
  @RequirePermissions('property.valuation.create')
  addValuation(@CurrentUser() user: JwtClaims, @Param('id') id: string, @Body() dto: CreateValuationDto) {
    return this.propertiesService.addValuation(user.organisation_id, id, dto);
  }

  @Get(':id/valuations')
  @RequirePermissions('property.valuation.read')
  listValuations(@CurrentUser() user: JwtClaims, @Param('id') id: string) {
    return this.propertiesService.listValuations(user.organisation_id, id);
  }
}
