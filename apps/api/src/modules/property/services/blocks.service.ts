import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantDatabaseService } from '../../../database/database.service';
import { PropertiesRepository } from '../repositories/properties.repository';
import { BlocksRepository } from '../repositories/blocks.repository';
import { CreateBlockDto } from '../dto/create-block.dto';

@Injectable()
export class BlocksService {
  constructor(
    private readonly db: TenantDatabaseService,
    private readonly propertiesRepo: PropertiesRepository,
    private readonly blocksRepo: BlocksRepository,
  ) {}

  async create(organisationId: string, propertyId: string, dto: CreateBlockDto) {
    return this.db.withTenant(organisationId, async (trx) => {
      const property = await this.propertiesRepo.findById(trx, organisationId, propertyId);
      if (!property) {
        throw new NotFoundException('Property not found');
      }
      return this.blocksRepo.create(trx, { organisation_id: organisationId, property_id: propertyId, name: dto.name });
    });
  }

  async get(organisationId: string, blockId: string) {
    const block = await this.db.withTenant(organisationId, (trx) => this.blocksRepo.findById(trx, organisationId, blockId));
    if (!block) {
      throw new NotFoundException('Block not found');
    }
    return block;
  }

  async listForProperty(organisationId: string, propertyId: string) {
    return this.db.withTenant(organisationId, (trx) => this.blocksRepo.listForProperty(trx, organisationId, propertyId));
  }
}
