import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantDatabaseService } from '../../../database/database.service';
import { GuardsRepository } from '../repositories/guards.repository';
import { AssignGuardDto } from '../dto/assign-guard.dto';

@Injectable()
export class GuardsService {
  constructor(
    private readonly db: TenantDatabaseService,
    private readonly guardsRepo: GuardsRepository,
  ) {}

  async assign(organisationId: string, dto: AssignGuardDto) {
    return this.db.withTenant(organisationId, (trx) =>
      this.guardsRepo.create(trx, { organisation_id: organisationId, user_id: dto.userId, property_id: dto.propertyId }),
    );
  }

  async get(organisationId: string, guardId: string) {
    const guard = await this.db.withTenant(organisationId, (trx) => this.guardsRepo.findById(trx, organisationId, guardId));
    if (!guard) {
      throw new NotFoundException('Guard not found');
    }
    return guard;
  }

  async listForProperty(organisationId: string, propertyId: string) {
    return this.db.withTenant(organisationId, (trx) => this.guardsRepo.listForProperty(trx, organisationId, propertyId));
  }

  /** Resolves a SecurityGuard-role caller's own assigned property, for auto-filling forms (e.g. incident reports) rather than trusting a client-supplied propertyId. */
  async resolveOwnPropertyId(organisationId: string, userId: string): Promise<string | null> {
    const guard = await this.db.withTenant(organisationId, (trx) => this.guardsRepo.findByUserId(trx, organisationId, userId));
    return guard?.property_id ?? null;
  }

  /** Full guard record for "who am I" — see GuardsController.getOwn. */
  async getOwn(organisationId: string, userId: string) {
    const guard = await this.db.withTenant(organisationId, (trx) => this.guardsRepo.findByUserId(trx, organisationId, userId));
    if (!guard) {
      throw new NotFoundException('Your account is not assigned to a property as a guard yet');
    }
    return guard;
  }
}
