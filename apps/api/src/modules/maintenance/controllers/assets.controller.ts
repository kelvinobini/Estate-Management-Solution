import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtClaims } from '../../../common/interfaces/authenticated-request.interface';
import { AssetsService } from '../services/assets.service';
import { MaintenanceSchedulesService } from '../services/maintenance-schedules.service';
import { CreateAssetDto } from '../dto/create-asset.dto';
import { UpdateAssetStatusDto } from '../dto/update-asset-status.dto';
import { CreateMaintenanceScheduleDto } from '../dto/create-maintenance-schedule.dto';

@Controller('assets')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AssetsController {
  constructor(
    private readonly assetsService: AssetsService,
    private readonly schedulesService: MaintenanceSchedulesService,
  ) {}

  @Post()
  @RequirePermissions('asset.create')
  create(@CurrentUser() user: JwtClaims, @Body() dto: CreateAssetDto) {
    return this.assetsService.create(user.organisation_id, dto);
  }

  @Get('property/:propertyId')
  @RequirePermissions('asset.read')
  listForProperty(@CurrentUser() user: JwtClaims, @Param('propertyId') propertyId: string) {
    return this.assetsService.listForProperty(user.organisation_id, propertyId);
  }

  @Get('qr/:qrCode')
  @RequirePermissions('asset.read')
  findByQrCode(@CurrentUser() user: JwtClaims, @Param('qrCode') qrCode: string) {
    return this.assetsService.findByQrCode(user.organisation_id, qrCode);
  }

  @Get(':id')
  @RequirePermissions('asset.read')
  get(@CurrentUser() user: JwtClaims, @Param('id') id: string) {
    return this.assetsService.get(user.organisation_id, id);
  }

  @Patch(':id/status')
  @RequirePermissions('asset.update')
  updateStatus(@CurrentUser() user: JwtClaims, @Param('id') id: string, @Body() dto: UpdateAssetStatusDto) {
    return this.assetsService.updateStatus(user.organisation_id, id, dto);
  }

  @Post(':assetId/schedules')
  @RequirePermissions('maintenance_schedule.create')
  createSchedule(@CurrentUser() user: JwtClaims, @Param('assetId') assetId: string, @Body() dto: CreateMaintenanceScheduleDto) {
    return this.schedulesService.create(user.organisation_id, { ...dto, assetId });
  }

  @Get(':assetId/schedules')
  @RequirePermissions('maintenance_schedule.read')
  listSchedules(@CurrentUser() user: JwtClaims, @Param('assetId') assetId: string) {
    return this.schedulesService.listForAsset(user.organisation_id, assetId);
  }
}
