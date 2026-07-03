import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TenantDatabaseService } from '../../../database/database.service';
import { FloorsRepository } from '../repositories/floors.repository';
import { BlocksRepository } from '../repositories/blocks.repository';
import { UnitsRepository } from '../repositories/units.repository';
import { UnitMediaRepository } from '../repositories/unit-media.repository';
import { CreateUnitDto } from '../dto/create-unit.dto';
import { UpdateUnitDto } from '../dto/update-unit.dto';
import { CreateUnitMediaDto } from '../dto/create-unit-media.dto';

/**
 * Valid next statuses per current unit status. A unit can't jump straight from
 * `occupied` to `reserved` (it must be vacated first), and re-setting the same
 * status is treated as a no-op rather than an error.
 */
const ALLOWED_STATUS_TRANSITIONS: Record<string, string[]> = {
  vacant: ['reserved', 'occupied', 'under_maintenance'],
  reserved: ['occupied', 'vacant'],
  occupied: ['vacant', 'under_maintenance'],
  under_maintenance: ['vacant', 'occupied'],
};

export const UnitEvent = {
  StatusChanged: 'unit.status_changed',
} as const;

@Injectable()
export class UnitsService {
  constructor(
    private readonly db: TenantDatabaseService,
    private readonly floorsRepo: FloorsRepository,
    private readonly blocksRepo: BlocksRepository,
    private readonly unitsRepo: UnitsRepository,
    private readonly unitMediaRepo: UnitMediaRepository,
    private readonly events: EventEmitter2,
  ) {}

  async create(organisationId: string, floorId: string, dto: CreateUnitDto) {
    return this.db.withTenant(organisationId, async (trx) => {
      const floor = await this.floorsRepo.findById(trx, organisationId, floorId);
      if (!floor) {
        throw new NotFoundException('Floor not found');
      }
      return this.unitsRepo.create(trx, {
        organisation_id: organisationId,
        floor_id: floorId,
        unit_code: dto.unitCode,
        unit_type: dto.unitType,
        bedrooms: dto.bedrooms ?? null,
        bathrooms: dto.bathrooms ?? null,
        size_sqm: dto.sizeSqm ?? null,
        base_rent_kobo: dto.baseRentKobo ?? 0,
        service_charge_kobo: dto.serviceChargeKobo ?? 0,
        virtual_tour_url: dto.virtualTourUrl ?? null,
      });
    });
  }

  async get(organisationId: string, unitId: string) {
    const unit = await this.db.withTenant(organisationId, (trx) => this.unitsRepo.findById(trx, organisationId, unitId));
    if (!unit) {
      throw new NotFoundException('Unit not found');
    }
    return unit;
  }

  /**
   * Walks unit -> floor -> block to find the owning property. Units don't
   * carry a direct property_id (only floor_id), and callers without staff
   * permissions (e.g. a Tenant filing a work order) have no other way to
   * learn their own property's id — floor.read/block.read aren't granted to
   * Tenant — so this lets a unit-only reference resolve the rest server-side.
   */
  async resolvePropertyId(organisationId: string, unitId: string): Promise<string> {
    const unit = await this.get(organisationId, unitId);
    const floor = await this.db.withTenant(organisationId, (trx) => this.floorsRepo.findById(trx, organisationId, unit.floor_id));
    if (!floor) {
      throw new NotFoundException('Floor not found for this unit');
    }
    const block = await this.db.withTenant(organisationId, (trx) => this.blocksRepo.findById(trx, organisationId, floor.block_id));
    if (!block) {
      throw new NotFoundException('Block not found for this unit');
    }
    return block.property_id;
  }

  async listForFloor(organisationId: string, floorId: string) {
    return this.db.withTenant(organisationId, (trx) => this.unitsRepo.listForFloor(trx, organisationId, floorId));
  }

  async listByStatus(organisationId: string, status: string) {
    return this.db.withTenant(organisationId, (trx) => this.unitsRepo.listByStatus(trx, organisationId, status));
  }

  async update(organisationId: string, unitId: string, dto: UpdateUnitDto) {
    await this.get(organisationId, unitId);
    return this.db.withTenant(organisationId, (trx) =>
      this.unitsRepo.update(trx, organisationId, unitId, {
        ...(dto.bedrooms !== undefined && { bedrooms: dto.bedrooms }),
        ...(dto.bathrooms !== undefined && { bathrooms: dto.bathrooms }),
        ...(dto.sizeSqm !== undefined && { size_sqm: dto.sizeSqm }),
        ...(dto.baseRentKobo !== undefined && { base_rent_kobo: dto.baseRentKobo }),
        ...(dto.serviceChargeKobo !== undefined && { service_charge_kobo: dto.serviceChargeKobo }),
        ...(dto.virtualTourUrl !== undefined && { virtual_tour_url: dto.virtualTourUrl }),
      }),
    );
  }

  async updateStatus(organisationId: string, unitId: string, newStatus: string) {
    return this.db.withTenant(organisationId, async (trx) => {
      const unit = await this.unitsRepo.findById(trx, organisationId, unitId);
      if (!unit) {
        throw new NotFoundException('Unit not found');
      }

      if (unit.status === newStatus) {
        return unit;
      }

      const allowedNext = ALLOWED_STATUS_TRANSITIONS[unit.status] ?? [];
      if (!allowedNext.includes(newStatus)) {
        throw new BadRequestException(`Cannot transition unit from '${unit.status}' to '${newStatus}'`);
      }

      const updated = await this.unitsRepo.updateStatus(trx, organisationId, unitId, newStatus);
      this.events.emit(UnitEvent.StatusChanged, { organisationId, unitId, from: unit.status, to: newStatus });
      return updated;
    });
  }

  async remove(organisationId: string, unitId: string): Promise<void> {
    await this.get(organisationId, unitId);
    await this.db.withTenant(organisationId, (trx) => this.unitsRepo.softDelete(trx, organisationId, unitId));
  }

  async addMedia(organisationId: string, unitId: string, dto: CreateUnitMediaDto) {
    await this.get(organisationId, unitId);
    return this.db.withTenant(organisationId, (trx) =>
      this.unitMediaRepo.create(trx, {
        organisation_id: organisationId,
        unit_id: unitId,
        media_type: dto.mediaType,
        url: dto.url,
        sort_order: dto.sortOrder ?? 0,
      }),
    );
  }

  async listMedia(organisationId: string, unitId: string) {
    return this.db.withTenant(organisationId, (trx) => this.unitMediaRepo.listForUnit(trx, organisationId, unitId));
  }

  async removeMedia(organisationId: string, mediaId: string): Promise<void> {
    await this.db.withTenant(organisationId, (trx) => this.unitMediaRepo.delete(trx, organisationId, mediaId));
  }
}
