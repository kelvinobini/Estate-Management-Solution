import { BadRequestException, Controller, ForbiddenException, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtClaims } from '../../../common/interfaces/authenticated-request.interface';
import { ReportingService } from '../services/reporting.service';
import { PropertiesService } from '../../property/services/properties.service';

@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('report.read')
export class ReportingController {
  constructor(
    private readonly reportingService: ReportingService,
    private readonly propertiesService: PropertiesService,
  ) {}

  @Get('occupancy')
  async occupancy(@CurrentUser() user: JwtClaims, @Query('propertyId') propertyId?: string) {
    await this.assertLandlordPropertyAccess(user, propertyId);
    return this.reportingService.occupancySummary(user.organisation_id, propertyId);
  }

  @Get('revenue')
  async revenue(
    @CurrentUser() user: JwtClaims,
    @Query('propertyId') propertyId?: string,
    @Query('periodStart') periodStartRaw?: string,
    @Query('periodEnd') periodEndRaw?: string,
  ) {
    await this.assertLandlordPropertyAccess(user, propertyId);
    const periodEnd = periodEndRaw ? this.parseDate(periodEndRaw, 'periodEnd') : new Date();
    const periodStart = periodStartRaw ? this.parseDate(periodStartRaw, 'periodStart') : this.oneYearBefore(periodEnd);
    return this.reportingService.revenueSummary(user.organisation_id, propertyId, periodStart, periodEnd);
  }

  @Get('maintenance-cost')
  async maintenanceCost(@CurrentUser() user: JwtClaims, @Query('propertyId') propertyId?: string) {
    await this.assertLandlordPropertyAccess(user, propertyId);
    return this.reportingService.maintenanceCostSummary(user.organisation_id, propertyId);
  }

  /** Org-wide arrears across every tenant — no per-property breakdown exists, so Landlords (who'd otherwise see every other owner's arrears) are blocked entirely. */
  @Get('aged-debtors')
  agedDebtors(@CurrentUser() user: JwtClaims) {
    if (user.role === 'Landlord') {
      throw new ForbiddenException('Aged debtors is an org-wide report and is not available to Landlords');
    }
    return this.reportingService.agedDebtors(user.organisation_id);
  }

  @Get('rent-roll')
  async rentRoll(@CurrentUser() user: JwtClaims, @Query('propertyId') propertyId?: string) {
    await this.assertLandlordPropertyAccess(user, propertyId);
    return this.reportingService.rentRoll(user.organisation_id, propertyId);
  }

  @Get('average-days-to-let')
  async averageDaysToLet(@CurrentUser() user: JwtClaims, @Query('propertyId') propertyId?: string) {
    await this.assertLandlordPropertyAccess(user, propertyId);
    return this.reportingService.averageDaysToLet(user.organisation_id, propertyId);
  }

  @Get('property-yield/:propertyId')
  async propertyYield(@CurrentUser() user: JwtClaims, @Param('propertyId') propertyId: string) {
    await this.assertLandlordPropertyAccess(user, propertyId);
    return this.reportingService.propertyYield(user.organisation_id, propertyId);
  }

  /**
   * All propertyId-scoped reports share this rule for Landlords: a propertyId
   * is required (no portfolio-wide aggregate view exists yet for them), and it
   * must be one they own. Non-Landlord roles are unaffected.
   */
  private async assertLandlordPropertyAccess(user: JwtClaims, propertyId?: string): Promise<void> {
    if (user.role !== 'Landlord') return;
    if (!propertyId) {
      throw new ForbiddenException('Landlords must specify a propertyId; portfolio-wide reports are not available yet');
    }
    const owns = await this.propertiesService.isOwner(user.organisation_id, propertyId, user.sub);
    if (!owns) {
      throw new ForbiddenException('Landlords may only view reports for properties they own');
    }
  }

  private parseDate(raw: string, field: string): Date {
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${field} must be a valid ISO 8601 date`);
    }
    return date;
  }

  private oneYearBefore(date: Date): Date {
    const result = new Date(date);
    result.setFullYear(result.getFullYear() - 1);
    return result;
  }
}
