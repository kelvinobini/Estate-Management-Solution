import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { TenantDatabaseService } from '../../../database/database.service';
import { AssetsRepository } from '../repositories/assets.repository';
import { CreateAssetDto } from '../dto/create-asset.dto';
import { UpdateAssetStatusDto } from '../dto/update-asset-status.dto';

@Injectable()
export class AssetsService {
  constructor(
    private readonly db: TenantDatabaseService,
    private readonly assetsRepo: AssetsRepository,
  ) {}

  async create(organisationId: string, dto: CreateAssetDto) {
    return this.db.withTenant(organisationId, (trx) =>
      this.assetsRepo.create(trx, {
        organisation_id: organisationId,
        property_id: dto.propertyId,
        unit_id: dto.unitId ?? null,
        name: dto.name,
        asset_type: dto.assetType,
        qr_code: this.generateQrCode(),
        serial_number: dto.serialNumber ?? null,
        installed_at: dto.installedAt ?? null,
        warranty_expiry: dto.warrantyExpiry ?? null,
      }),
    );
  }

  async get(organisationId: string, assetId: string) {
    const asset = await this.db.withTenant(organisationId, (trx) => this.assetsRepo.findById(trx, organisationId, assetId));
    if (!asset) {
      throw new NotFoundException('Asset not found');
    }
    return asset;
  }

  async findByQrCode(organisationId: string, qrCode: string) {
    const asset = await this.db.withTenant(organisationId, (trx) => this.assetsRepo.findByQrCode(trx, organisationId, qrCode));
    if (!asset) {
      throw new NotFoundException('No asset found for this QR code');
    }
    return asset;
  }

  async listForProperty(organisationId: string, propertyId: string) {
    return this.db.withTenant(organisationId, (trx) => this.assetsRepo.listForProperty(trx, organisationId, propertyId));
  }

  async updateStatus(organisationId: string, assetId: string, dto: UpdateAssetStatusDto) {
    await this.get(organisationId, assetId);
    return this.db.withTenant(organisationId, (trx) => this.assetsRepo.update(trx, organisationId, assetId, { status: dto.status }));
  }

  /** e.g. "AST-4F2A9C1B" — short enough to fit on a printed tag, unique enough at estate scale. */
  private generateQrCode(): string {
    return `AST-${randomBytes(4).toString('hex').toUpperCase()}`;
  }
}
