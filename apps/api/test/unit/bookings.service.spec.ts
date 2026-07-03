import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BookingsService } from '../../src/modules/community/services/bookings.service';

describe('BookingsService.create', () => {
  const organisationId = 'org-1';
  let db: any;
  let amenitiesRepo: any;
  let bookingsRepo: any;
  let service: BookingsService;

  beforeEach(() => {
    db = { withTenant: jest.fn((_orgId: string, work: (trx: unknown) => unknown) => work({})) };
    amenitiesRepo = { findById: jest.fn() };
    bookingsRepo = {
      findOverlapping: jest.fn(async () => []),
      create: jest.fn(async (_trx, booking) => ({ id: 'booking-1', ...booking })),
      findById: jest.fn(),
      update: jest.fn(async (_trx, _orgId, id, changes) => ({ id, ...changes })),
    };

    service = new BookingsService(db, amenitiesRepo, bookingsRepo);
  });

  it('throws NotFoundException for a non-existent amenity', async () => {
    amenitiesRepo.findById.mockResolvedValue(undefined);
    await expect(
      service.create(organisationId, 'tenant-1', { tenantId: 'tenant-1', amenityId: 'amenity-1', startTime: '2026-08-01T10:00:00Z', endTime: '2026-08-01T11:00:00Z' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects an end time that is not after the start time', async () => {
    amenitiesRepo.findById.mockResolvedValue({ id: 'amenity-1' });
    await expect(
      service.create(organisationId, 'tenant-1', { tenantId: 'tenant-1', amenityId: 'amenity-1', startTime: '2026-08-01T11:00:00Z', endTime: '2026-08-01T10:00:00Z' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a booking that overlaps an existing one for the same amenity', async () => {
    amenitiesRepo.findById.mockResolvedValue({ id: 'amenity-1' });
    bookingsRepo.findOverlapping.mockResolvedValue([{ id: 'existing-booking' }]);

    await expect(
      service.create(organisationId, 'tenant-1', { tenantId: 'tenant-1', amenityId: 'amenity-1', startTime: '2026-08-01T10:00:00Z', endTime: '2026-08-01T11:00:00Z' }),
    ).rejects.toThrow(BadRequestException);
    expect(bookingsRepo.create).not.toHaveBeenCalled();
  });

  it('creates a non-overlapping booking', async () => {
    amenitiesRepo.findById.mockResolvedValue({ id: 'amenity-1' });

    const booking = await service.create(organisationId, 'tenant-1', {
      tenantId: 'tenant-1',
      amenityId: 'amenity-1',
      startTime: '2026-08-01T10:00:00Z',
      endTime: '2026-08-01T11:00:00Z',
    });

    expect(booking.id).toBe('booking-1');
  });

  it('rejects cancelling an already-cancelled booking', async () => {
    bookingsRepo.findById.mockResolvedValue({ id: 'booking-1', status: 'cancelled' });
    await expect(service.cancel(organisationId, 'booking-1')).rejects.toThrow(BadRequestException);
  });

  it('cancels a confirmed booking', async () => {
    bookingsRepo.findById.mockResolvedValue({ id: 'booking-1', status: 'confirmed' });
    const result = await service.cancel(organisationId, 'booking-1');
    expect(result.status).toBe('cancelled');
  });
});
