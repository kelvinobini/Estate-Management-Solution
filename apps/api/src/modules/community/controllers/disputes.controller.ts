import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtClaims } from '../../../common/interfaces/authenticated-request.interface';
import { DisputesService } from '../services/disputes.service';
import { CreateDisputeDto } from '../dto/create-dispute.dto';
import { UpdateDisputeStatusDto } from '../dto/update-dispute-status.dto';

@Controller('disputes')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  @Post()
  @RequirePermissions('dispute.create')
  create(@CurrentUser() user: JwtClaims, @Body() dto: CreateDisputeDto) {
    return this.disputesService.create(user.organisation_id, user.sub, dto);
  }

  /**
   * Staff-only: unlike complaints/bookings, disputes have no direct tenant_id
   * to check ownership against (only an optional lease_id/complaint_id), and
   * Tenant-role self-service was never wired up for this resource (no
   * dispute.create grant) — so there's no legitimate tenant-facing path to
   * protect, only a blanket block.
   */
  @Get('lease/:leaseId')
  @RequirePermissions('dispute.read')
  listForLease(@CurrentUser() user: JwtClaims, @Param('leaseId') leaseId: string) {
    if (user.role === 'Tenant') {
      throw new ForbiddenException('Tenants may not view lease disputes directly');
    }
    return this.disputesService.listForLease(user.organisation_id, leaseId);
  }

  @Get(':id')
  @RequirePermissions('dispute.read')
  get(@CurrentUser() user: JwtClaims, @Param('id') id: string) {
    if (user.role === 'Tenant') {
      throw new ForbiddenException('Tenants may not view dispute details directly');
    }
    return this.disputesService.get(user.organisation_id, id);
  }

  @Patch(':id/status')
  @RequirePermissions('dispute.update')
  updateStatus(@CurrentUser() user: JwtClaims, @Param('id') id: string, @Body() dto: UpdateDisputeStatusDto) {
    return this.disputesService.updateStatus(user.organisation_id, id, dto);
  }
}
