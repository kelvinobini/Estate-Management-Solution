import { Controller, Get, NotFoundException, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtClaims } from '../../../common/interfaces/authenticated-request.interface';
import { ComplianceCertificatesService } from '../services/compliance-certificates.service';
import { getJurisdictionChecklist, listSupportedJurisdictions } from '../data/jurisdiction-checklists';

@Controller('compliance')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('compliance.read')
export class ComplianceController {
  constructor(private readonly certificatesService: ComplianceCertificatesService) {}

  @Get('certificates')
  listCertificates(@CurrentUser() user: JwtClaims, @Query('propertyId') propertyId?: string) {
    return this.certificatesService.list(user.organisation_id, propertyId);
  }

  @Get('checklists')
  listJurisdictions() {
    return listSupportedJurisdictions();
  }

  @Get('checklists/:jurisdiction')
  getChecklist(@Param('jurisdiction') jurisdiction: string) {
    const checklist = getJurisdictionChecklist(jurisdiction);
    if (!checklist) {
      throw new NotFoundException(`No checklist available for jurisdiction '${jurisdiction}'. See GET /compliance/checklists for the supported list.`);
    }
    return checklist;
  }
}
