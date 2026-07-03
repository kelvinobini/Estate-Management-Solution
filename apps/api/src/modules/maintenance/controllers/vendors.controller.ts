import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtClaims } from '../../../common/interfaces/authenticated-request.interface';
import { VendorsService } from '../services/vendors.service';
import { CreateVendorDto } from '../dto/create-vendor.dto';
import { UpdateVendorPerformanceDto, UpdateVendorStatusDto } from '../dto/update-vendor-performance.dto';

@Controller('vendors')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Post()
  @RequirePermissions('vendor.create')
  create(@CurrentUser() user: JwtClaims, @Body() dto: CreateVendorDto) {
    return this.vendorsService.create(user.organisation_id, dto);
  }

  @Get()
  @RequirePermissions('vendor.read')
  list(@CurrentUser() user: JwtClaims) {
    return this.vendorsService.list(user.organisation_id);
  }

  @Get(':id')
  @RequirePermissions('vendor.read')
  get(@CurrentUser() user: JwtClaims, @Param('id') id: string) {
    return this.vendorsService.get(user.organisation_id, id);
  }

  @Patch(':id/performance')
  @RequirePermissions('vendor.update')
  updatePerformance(@CurrentUser() user: JwtClaims, @Param('id') id: string, @Body() dto: UpdateVendorPerformanceDto) {
    return this.vendorsService.updatePerformanceScore(user.organisation_id, id, dto);
  }

  @Patch(':id/status')
  @RequirePermissions('vendor.update')
  updateStatus(@CurrentUser() user: JwtClaims, @Param('id') id: string, @Body() dto: UpdateVendorStatusDto) {
    return this.vendorsService.updateStatus(user.organisation_id, id, dto);
  }
}
