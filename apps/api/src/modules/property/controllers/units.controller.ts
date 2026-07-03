import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
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
import { UnitsService } from '../services/units.service';
import { CreateUnitDto } from '../dto/create-unit.dto';
import { UpdateUnitDto } from '../dto/update-unit.dto';
import { UpdateUnitStatusDto } from '../dto/update-unit-status.dto';
import { CreateUnitMediaDto } from '../dto/create-unit-media.dto';

const VALID_UNIT_STATUSES = ['vacant', 'occupied', 'under_maintenance', 'reserved'];

@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  @Post('floors/:floorId/units')
  @RequirePermissions('unit.create')
  create(@CurrentUser() user: JwtClaims, @Param('floorId') floorId: string, @Body() dto: CreateUnitDto) {
    return this.unitsService.create(user.organisation_id, floorId, dto);
  }

  @Get('floors/:floorId/units')
  @RequirePermissions('unit.read')
  listForFloor(@CurrentUser() user: JwtClaims, @Param('floorId') floorId: string) {
    return this.unitsService.listForFloor(user.organisation_id, floorId);
  }

  @Get('units')
  @RequirePermissions('unit.read')
  listByStatus(@CurrentUser() user: JwtClaims, @Query('status') status: string) {
    if (!VALID_UNIT_STATUSES.includes(status)) {
      throw new BadRequestException(`status must be one of: ${VALID_UNIT_STATUSES.join(', ')}`);
    }
    return this.unitsService.listByStatus(user.organisation_id, status);
  }

  @Get('units/:id')
  @RequirePermissions('unit.read')
  get(@CurrentUser() user: JwtClaims, @Param('id') id: string) {
    return this.unitsService.get(user.organisation_id, id);
  }

  /**
   * Units don't carry a direct property_id (only floor_id — see
   * UnitsService.resolvePropertyId), and Tenant lacks floor.read/block.read
   * to walk that chain itself. Gated by unit.read (which Tenant does hold),
   * so a tenant client can resolve "which property is my unit in" — e.g. to
   * browse that property's amenities — without a broader permission grant.
   */
  @Get('units/:id/property-id')
  @RequirePermissions('unit.read')
  async getPropertyId(@CurrentUser() user: JwtClaims, @Param('id') id: string) {
    const propertyId = await this.unitsService.resolvePropertyId(user.organisation_id, id);
    return { propertyId };
  }

  @Patch('units/:id')
  @RequirePermissions('unit.update')
  update(@CurrentUser() user: JwtClaims, @Param('id') id: string, @Body() dto: UpdateUnitDto) {
    return this.unitsService.update(user.organisation_id, id, dto);
  }

  @Patch('units/:id/status')
  @RequirePermissions('unit.status.update')
  updateStatus(@CurrentUser() user: JwtClaims, @Param('id') id: string, @Body() dto: UpdateUnitStatusDto) {
    return this.unitsService.updateStatus(user.organisation_id, id, dto.status);
  }

  @Delete('units/:id')
  @HttpCode(204)
  @RequirePermissions('unit.delete')
  async remove(@CurrentUser() user: JwtClaims, @Param('id') id: string) {
    await this.unitsService.remove(user.organisation_id, id);
  }

  @Post('units/:id/media')
  @RequirePermissions('unit.media.create')
  addMedia(@CurrentUser() user: JwtClaims, @Param('id') id: string, @Body() dto: CreateUnitMediaDto) {
    return this.unitsService.addMedia(user.organisation_id, id, dto);
  }

  @Get('units/:id/media')
  @RequirePermissions('unit.media.read')
  listMedia(@CurrentUser() user: JwtClaims, @Param('id') id: string) {
    return this.unitsService.listMedia(user.organisation_id, id);
  }

  @Delete('units/:unitId/media/:mediaId')
  @HttpCode(204)
  @RequirePermissions('unit.media.delete')
  async removeMedia(@CurrentUser() user: JwtClaims, @Param('mediaId') mediaId: string) {
    await this.unitsService.removeMedia(user.organisation_id, mediaId);
  }
}
