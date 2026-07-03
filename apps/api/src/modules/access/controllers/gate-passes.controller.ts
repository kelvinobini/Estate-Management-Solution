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
import { GatePassesService } from '../services/gate-passes.service';
import { VisitorsService } from '../services/visitors.service';
import { CheckInGatePassDto } from '../dto/check-in-gate-pass.dto';

const VALID_GATE_PASS_STATUSES = ['issued', 'checked_in', 'checked_out', 'expired', 'revoked'];

@Controller('gate-passes')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class GatePassesController {
  constructor(
    private readonly gatePassesService: GatePassesService,
    private readonly visitorsService: VisitorsService,
  ) {}

  @Post('check-in')
  @RequirePermissions('gate_pass.check_in')
  checkIn(@CurrentUser() user: JwtClaims, @Body() dto: CheckInGatePassDto) {
    return this.gatePassesService.checkIn(user.organisation_id, dto);
  }

  @Patch(':id/check-out')
  @RequirePermissions('gate_pass.check_in')
  checkOut(@CurrentUser() user: JwtClaims, @Param('id') id: string) {
    return this.gatePassesService.checkOut(user.organisation_id, id);
  }

  @Patch(':id/revoke')
  @RequirePermissions('gate_pass.revoke')
  revoke(@CurrentUser() user: JwtClaims, @Param('id') id: string) {
    return this.gatePassesService.revoke(user.organisation_id, id);
  }

  /** Gate/front-desk log — staff-only, since it spans every tenant's visitors. */
  @Get()
  @RequirePermissions('gate_pass.read')
  listByStatus(
    @CurrentUser() user: JwtClaims,
    @Query('status') status: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    if (user.role === 'Tenant') {
      throw new ForbiddenException('Tenants may only view gate passes for visitors they hosted');
    }
    if (!VALID_GATE_PASS_STATUSES.includes(status)) {
      throw new BadRequestException(`status must be one of: ${VALID_GATE_PASS_STATUSES.join(', ')}`);
    }
    return this.gatePassesService.listByStatus(user.organisation_id, status, {
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
    });
  }

  @Get(':id')
  @RequirePermissions('gate_pass.read')
  async get(@CurrentUser() user: JwtClaims, @Param('id') id: string) {
    const gatePass = await this.gatePassesService.get(user.organisation_id, id);
    if (user.role === 'Tenant') {
      const visitor = await this.visitorsService.get(user.organisation_id, gatePass.visitor_id);
      if (visitor.host_tenant_id !== user.sub) {
        throw new ForbiddenException('Tenants may only view gate passes for visitors they hosted');
      }
    }
    return gatePass;
  }
}
