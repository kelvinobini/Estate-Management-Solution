import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MeterReadingsService } from '../../src/modules/utilities/services/meter-readings.service';

describe('MeterReadingsService.record', () => {
  const organisationId = 'org-1';
  let db: any;
  let metersRepo: any;
  let readingsRepo: any;
  let service: MeterReadingsService;

  beforeEach(() => {
    db = { withTenant: jest.fn((_orgId: string, work: (trx: unknown) => unknown) => work({})) };
    metersRepo = { findById: jest.fn() };
    readingsRepo = {
      findLatest: jest.fn(),
      create: jest.fn(async (_trx, reading) => ({ id: 'reading-1', ...reading })),
    };

    service = new MeterReadingsService(db, metersRepo, readingsRepo);
  });

  it('throws NotFoundException for a non-existent meter', async () => {
    metersRepo.findById.mockResolvedValue(undefined);
    await expect(service.record(organisationId, 'meter-1', { readingValue: '100' })).rejects.toThrow(NotFoundException);
  });

  it('accepts the first reading for a meter with no history', async () => {
    metersRepo.findById.mockResolvedValue({ id: 'meter-1' });
    readingsRepo.findLatest.mockResolvedValue(undefined);

    const reading = await service.record(organisationId, 'meter-1', { readingValue: '100.5' });
    expect(reading.reading_value).toBe('100.5');
  });

  it('accepts a reading higher than the last one', async () => {
    metersRepo.findById.mockResolvedValue({ id: 'meter-1' });
    readingsRepo.findLatest.mockResolvedValue({ reading_value: '100.000' });

    await expect(service.record(organisationId, 'meter-1', { readingValue: '150.250' })).resolves.toBeDefined();
  });

  it('rejects a reading lower than the last recorded one', async () => {
    metersRepo.findById.mockResolvedValue({ id: 'meter-1' });
    readingsRepo.findLatest.mockResolvedValue({ reading_value: '200.000' });

    await expect(service.record(organisationId, 'meter-1', { readingValue: '150.000' })).rejects.toThrow(BadRequestException);
    expect(readingsRepo.create).not.toHaveBeenCalled();
  });
});
