import { ReportingService } from '../../src/modules/reporting/services/reporting.service';

describe('ReportingService', () => {
  const organisationId = 'org-1';
  let db: any;
  let reportingRepo: any;
  let service: ReportingService;

  beforeEach(() => {
    db = { withTenant: jest.fn((_orgId: string, work: (trx: unknown) => unknown) => work({})) };
    reportingRepo = {
      occupancyByStatus: jest.fn(),
      totalRevenueKobo: jest.fn(),
      totalMaintenanceCostKobo: jest.fn(),
      totalUnitAreaSqm: jest.fn(),
      agedDebtors: jest.fn(),
      rentRoll: jest.fn(),
      averageDaysToLet: jest.fn(),
      latestPropertyValuationKobo: jest.fn(),
    };
    service = new ReportingService(db, reportingRepo);
  });

  describe('occupancySummary', () => {
    it('defaults missing statuses to zero and computes occupancy/vacancy rates', async () => {
      reportingRepo.occupancyByStatus.mockResolvedValue([
        { status: 'occupied', unit_count: 7 },
        { status: 'vacant', unit_count: 3 },
      ]);

      const result = await service.occupancySummary(organisationId);

      expect(result.totalUnits).toBe(10);
      expect(result.byStatus).toEqual({ vacant: 3, occupied: 7, under_maintenance: 0, reserved: 0 });
      expect(result.occupancyRatePercent).toBe(70);
      expect(result.vacancyRatePercent).toBe(30);
    });

    it('returns zero rates instead of dividing by zero when there are no units', async () => {
      reportingRepo.occupancyByStatus.mockResolvedValue([]);
      const result = await service.occupancySummary(organisationId);
      expect(result.occupancyRatePercent).toBe(0);
      expect(result.vacancyRatePercent).toBe(0);
    });
  });

  describe('revenueSummary', () => {
    it('divides total revenue across occupied units', async () => {
      reportingRepo.totalRevenueKobo.mockResolvedValue({ total_kobo: '1000000' });
      reportingRepo.occupancyByStatus.mockResolvedValue([{ status: 'occupied', unit_count: 4 }]);

      const result = await service.revenueSummary(organisationId, undefined, new Date('2025-01-01'), new Date('2026-01-01'));

      expect(result.revenuePerOccupiedUnitKobo).toBe('250000');
    });

    it('returns zero per-unit revenue rather than dividing by zero when there are no occupied units', async () => {
      reportingRepo.totalRevenueKobo.mockResolvedValue({ total_kobo: '1000000' });
      reportingRepo.occupancyByStatus.mockResolvedValue([]);

      const result = await service.revenueSummary(organisationId, undefined, new Date('2025-01-01'), new Date('2026-01-01'));
      expect(result.revenuePerOccupiedUnitKobo).toBe('0');
    });
  });

  describe('maintenanceCostSummary', () => {
    it('returns a null cost-per-sqm when no property is specified (portfolio-wide)', async () => {
      reportingRepo.totalMaintenanceCostKobo.mockResolvedValue({ total_kobo: '500000' });
      const result = await service.maintenanceCostSummary(organisationId);
      expect(result.costPerSqm).toBeNull();
    });

    it('computes cost per sqm for a single property', async () => {
      reportingRepo.totalMaintenanceCostKobo.mockResolvedValue({ total_kobo: '500000' });
      reportingRepo.totalUnitAreaSqm.mockResolvedValue({ total_sqm: '250' });

      const result = await service.maintenanceCostSummary(organisationId, 'property-1');
      expect(result.costPerSqm).toBe(2000); // 500000 kobo / 250 sqm
    });

    it('returns null cost-per-sqm rather than dividing by zero when the property has no floor area on record', async () => {
      reportingRepo.totalMaintenanceCostKobo.mockResolvedValue({ total_kobo: '500000' });
      reportingRepo.totalUnitAreaSqm.mockResolvedValue({ total_sqm: '0' });

      const result = await service.maintenanceCostSummary(organisationId, 'property-1');
      expect(result.costPerSqm).toBeNull();
    });
  });

  describe('propertyYield', () => {
    it('returns null yield when the property has no valuation on record', async () => {
      reportingRepo.totalRevenueKobo.mockResolvedValue({ total_kobo: '1000000' });
      reportingRepo.latestPropertyValuationKobo.mockResolvedValue(undefined);

      const result = await service.propertyYield(organisationId, 'property-1');
      expect(result.grossYieldPercent).toBeNull();
    });

    it('computes gross yield as trailing revenue over latest valuation', async () => {
      reportingRepo.totalRevenueKobo.mockResolvedValue({ total_kobo: '1000000' }); // NGN 10,000 trailing revenue
      reportingRepo.latestPropertyValuationKobo.mockResolvedValue({ valuation_kobo: '10000000' }); // NGN 100,000 valuation

      const result = await service.propertyYield(organisationId, 'property-1');
      expect(result.grossYieldPercent).toBe(10);
    });
  });

  describe('averageDaysToLet', () => {
    it('passes through null when there is no lease-gap history', async () => {
      reportingRepo.averageDaysToLet.mockResolvedValue(null);
      const result = await service.averageDaysToLet(organisationId);
      expect(result.averageDaysToLet).toBeNull();
    });

    it('rounds the average to 2 decimal places', async () => {
      reportingRepo.averageDaysToLet.mockResolvedValue('14.3333333');
      const result = await service.averageDaysToLet(organisationId);
      expect(result.averageDaysToLet).toBe(14.33);
    });
  });
});
