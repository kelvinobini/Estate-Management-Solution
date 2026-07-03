import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantDatabaseService } from '../../../database/database.service';
import { BlocksRepository } from '../repositories/blocks.repository';
import { FloorsRepository } from '../repositories/floors.repository';
import { CreateFloorDto } from '../dto/create-floor.dto';

@Injectable()
export class FloorsService {
  constructor(
    private readonly db: TenantDatabaseService,
    private readonly blocksRepo: BlocksRepository,
    private readonly floorsRepo: FloorsRepository,
  ) {}

  async create(organisationId: string, blockId: string, dto: CreateFloorDto) {
    return this.db.withTenant(organisationId, async (trx) => {
      const block = await this.blocksRepo.findById(trx, organisationId, blockId);
      if (!block) {
        throw new NotFoundException('Block not found');
      }
      return this.floorsRepo.create(trx, {
        organisation_id: organisationId,
        block_id: blockId,
        level_number: dto.levelNumber,
        label: dto.label ?? null,
        floor_plan_url: dto.floorPlanUrl ?? null,
      });
    });
  }

  async get(organisationId: string, floorId: string) {
    const floor = await this.db.withTenant(organisationId, (trx) => this.floorsRepo.findById(trx, organisationId, floorId));
    if (!floor) {
      throw new NotFoundException('Floor not found');
    }
    return floor;
  }

  async listForBlock(organisationId: string, blockId: string) {
    return this.db.withTenant(organisationId, (trx) => this.floorsRepo.listForBlock(trx, organisationId, blockId));
  }
}
