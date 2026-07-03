import { Controller, ForbiddenException, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtClaims } from '../../../common/interfaces/authenticated-request.interface';
import { ArrearsService } from '../services/arrears.service';

@Controller('arrears')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ArrearsController {
  constructor(private readonly arrearsService: ArrearsService) {}

  @Get('tenant/:tenantId')
  @RequirePermissions('arrears.read')
  list(@CurrentUser() user: JwtClaims, @Param('tenantId') tenantId: string) {
    if (user.role === 'Tenant' && user.sub !== tenantId) {
      throw new ForbiddenException('Tenants may only view their own arrears');
    }
    return this.arrearsService.listForTenant(user.organisation_id, tenantId);
  }
}
