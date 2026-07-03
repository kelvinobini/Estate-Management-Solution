import { Injectable } from '@nestjs/common';
import { TenantDatabaseService } from '../../../database/database.service';
import { toKobo } from '../../../common/money.util';
import { ReportingRepository } from '../repositories/reporting.repository';

const UNIT_STATUSES = ['vacant', 'occupied', 'under_maintenance', 'reserved'] as const;

@Injectable()
export class ReportingService {
  constructor(
    private readonly db: TenantDatabaseService,
    private readonly reportingRepo: ReportingRepository,
  ) {}

  /** Occupancy/vacancy rates at portfolio (no propertyId) or single-property level. */
  async occupancySummary(organisationId: string, propertyId?: string) {
    const rows = await this.db.withTenant(organisationId, (trx) => this.reportingRepo.occupancyByStatus(trx, organisationId, propertyId));

    const byStatus = Object.fromEntries(UNIT_STATUSES.map((status) => [status, 0])) as Record<(typeof UNIT_STATUSES)[number], number>;
    for (const row of rows) {
      byStatus[row.status as (typeof UNIT_STATUSES)[number]] = Number(row.unit_count);
    }

    const totalUnits = Object.values(byStatus).reduce((sum, count) => sum + count, 0);
    return {
      totalUnits,
      byStatus,
      occupancyRatePercent: totalUnits === 0 ? 0 : round2((byStatus.occupied / totalUnits) * 100),
      vacancyRatePercent: totalUnits === 0 ? 0 : round2((byStatus.vacant / totalUnits) * 100),
    };
  }

  /** Total collected revenue in a period, at portfolio or single-property level, plus a simple average-per-unit figure. */
  async revenueSummary(organisationId: string, propertyId: string | undefined, periodStart: Date, periodEnd: Date) {
    const [{ total_kobo: totalRevenueKobo }, occupancy] = await Promise.all([
      this.db.withTenant(organisationId, (trx) => this.reportingRepo.totalRevenueKobo(trx, organisationId, propertyId, periodStart, periodEnd)),
      this.occupancySummary(organisationId, propertyId),
    ]);

    const occupiedUnits = occupancy.byStatus.occupied;
    return {
      periodStart: periodStart.toISOString().slice(0, 10),
      periodEnd: periodEnd.toISOString().slice(0, 10),
      totalRevenueKobo,
      revenuePerOccupiedUnitKobo: occupiedUnits === 0 ? '0' : (toKobo(totalRevenueKobo) / BigInt(occupiedUnits)).toString(),
    };
  }

  /** Total maintenance spend, and — for a single property — cost per square metre of floor area. */
  async maintenanceCostSummary(organisationId: string, propertyId?: string) {
    const { total_kobo: totalCostKobo } = await this.db.withTenant(organisationId, (trx) =>
      this.reportingRepo.totalMaintenanceCostKobo(trx, organisationId, propertyId),
    );

    if (!propertyId) {
      return { totalCostKobo, costPerSqm: null };
    }

    const { total_sqm: totalSqm } = await this.db.withTenant(organisationId, (trx) =>
      this.reportingRepo.totalUnitAreaSqm(trx, organisationId, propertyId),
    );

    const sqm = Number(totalSqm);
    return {
      totalCostKobo,
      costPerSqm: sqm === 0 ? null : round2(Number(toKobo(totalCostKobo)) / sqm),
    };
  }

  /** Outstanding arrears grouped by recovery stage — the "aged debtors" report. */
  async agedDebtors(organisationId: string) {
    return this.db.withTenant(organisationId, (trx) => this.reportingRepo.agedDebtors(trx, organisationId));
  }

  async rentRoll(organisationId: string, propertyId?: string) {
    return this.db.withTenant(organisationId, (trx) => this.reportingRepo.rentRoll(trx, organisationId, propertyId));
  }

  /** Average days a unit sits vacant between one tenancy ending and the next beginning — see ReportingRepository for the caveats. */
  async averageDaysToLet(organisationId: string, propertyId?: string) {
    const avgDays = await this.db.withTenant(organisationId, (trx) => this.reportingRepo.averageDaysToLet(trx, organisationId, propertyId));
    return { averageDaysToLet: avgDays === null ? null : round2(Number(avgDays)) };
  }

  /**
   * Gross yield = trailing-12-month revenue / latest valuation. This is a
   * simple yield figure, not a full IRR (which would need acquisition cost
   * and a modeled cash-flow schedule that isn't captured anywhere in the
   * schema — property_valuations only has point-in-time market valuations).
   */
  async propertyYield(organisationId: string, propertyId: string) {
    const periodEnd = new Date();
    const periodStart = new Date(periodEnd);
    periodStart.setFullYear(periodStart.getFullYear() - 1);

    const [{ total_kobo: annualRevenueKobo }, valuation] = await Promise.all([
      this.db.withTenant(organisationId, (trx) => this.reportingRepo.totalRevenueKobo(trx, organisationId, propertyId, periodStart, periodEnd)),
      this.db.withTenant(organisationId, (trx) => this.reportingRepo.latestPropertyValuationKobo(trx, organisationId, propertyId)),
    ]);

    if (!valuation) {
      return { annualRevenueKobo, valuationKobo: null, grossYieldPercent: null };
    }

    const grossYieldPercent = round2((Number(toKobo(annualRevenueKobo)) / Number(toKobo(valuation.valuation_kobo))) * 100);
    return { annualRevenueKobo, valuationKobo: valuation.valuation_kobo, grossYieldPercent };
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
