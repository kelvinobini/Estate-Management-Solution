import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TenantDatabaseService } from '../../../database/database.service';
import { AmenitiesRepository } from '../repositories/amenities.repository';
import { BookingsRepository } from '../repositories/bookings.repository';
import { CreateBookingDto } from '../dto/create-booking.dto';

@Injectable()
export class BookingsService {
  constructor(
    private readonly db: TenantDatabaseService,
    private readonly amenitiesRepo: AmenitiesRepository,
    private readonly bookingsRepo: BookingsRepository,
  ) {}

  async create(organisationId: string, tenantId: string, dto: CreateBookingDto) {
    return this.db.withTenant(organisationId, async (trx) => {
      const amenity = await this.amenitiesRepo.findById(trx, organisationId, dto.amenityId);
      if (!amenity) {
        throw new NotFoundException('Amenity not found');
      }

      const start = new Date(dto.startTime);
      const end = new Date(dto.endTime);
      if (end <= start) {
        throw new BadRequestException('endTime must be after startTime');
      }

      const overlapping = await this.bookingsRepo.findOverlapping(trx, organisationId, dto.amenityId, start, end);
      if (overlapping.length > 0) {
        throw new BadRequestException('This amenity is already booked for part of that time window');
      }

      return this.bookingsRepo.create(trx, {
        organisation_id: organisationId,
        amenity_id: dto.amenityId,
        tenant_id: tenantId,
        start_time: start,
        end_time: end,
      });
    });
  }

  async get(organisationId: string, bookingId: string) {
    const booking = await this.db.withTenant(organisationId, (trx) => this.bookingsRepo.findById(trx, organisationId, bookingId));
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    return booking;
  }

  async listForTenant(organisationId: string, tenantId: string) {
    return this.db.withTenant(organisationId, (trx) => this.bookingsRepo.listForTenant(trx, organisationId, tenantId));
  }

  /** Org-wide (per-amenity) booking calendar for staff. */
  async listForAmenity(organisationId: string, amenityId: string) {
    return this.db.withTenant(organisationId, (trx) => this.bookingsRepo.listForAmenity(trx, organisationId, amenityId));
  }

  async cancel(organisationId: string, bookingId: string) {
    return this.db.withTenant(organisationId, async (trx) => {
      const booking = await this.bookingsRepo.findById(trx, organisationId, bookingId);
      if (!booking) {
        throw new NotFoundException('Booking not found');
      }
      if (booking.status === 'cancelled') {
        throw new BadRequestException('Booking is already cancelled');
      }
      return this.bookingsRepo.update(trx, organisationId, bookingId, { status: 'cancelled' });
    });
  }
}
