import { Controller, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtClaims } from '../../../common/interfaces/authenticated-request.interface';
import { DataSubjectErasureService } from '../services/data-subject-erasure.service';

@Controller('compliance/data-subjects')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DataSubjectErasureController {
  constructor(private readonly erasureService: DataSubjectErasureService) {}

  /**
   * No @AuditAction/AuditLogInterceptor here — DataSubjectErasureService
   * already records its own (deliberately PII-free) audit entry internally,
   * so applying the generic interceptor too would double-log this action.
   */
  @Post('tenants/:tenantId/erase')
  @RequirePermissions('data_subject.erase')
  @HttpCode(200)
  async erase(@CurrentUser() user: JwtClaims, @Param('tenantId') tenantId: string) {
    await this.erasureService.eraseTenant(user.organisation_id, tenantId, user.sub);
    return { erased: true };
  }
}
