import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { TenantDatabaseService } from '../../../database/database.service';
import { TenantsRepository } from '../repositories/tenants.repository';
import { UsersRepository } from '../../users/repositories/users.repository';
import { CreateTenantDto } from '../dto/create-tenant.dto';
import { VerifyKycDto } from '../dto/verify-kyc.dto';

@Injectable()
export class TenantsService {
  constructor(
    private readonly db: TenantDatabaseService,
    private readonly tenantsRepo: TenantsRepository,
    private readonly usersRepo: UsersRepository,
  ) {}

  async create(organisationId: string, dto: CreateTenantDto) {
    return this.db.withTenant(organisationId, (trx) =>
      this.tenantsRepo.create(trx, {
        organisation_id: organisationId,
        full_name: dto.fullName,
        email: dto.email ?? null,
        phone: dto.phone,
        id_document_type: dto.idDocumentType ?? null,
        id_document_url: dto.idDocumentUrl ?? null,
      }),
    );
  }

  async get(organisationId: string, tenantId: string) {
    const tenant = await this.db.withTenant(organisationId, (trx) => this.tenantsRepo.findById(trx, organisationId, tenantId));
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    return tenant;
  }

  async list(organisationId: string) {
    return this.db.withTenant(organisationId, (trx) => this.tenantsRepo.listForOrganisation(trx, organisationId));
  }

  /** Records a KYC decision. See VerifyKycDto for why this is manual rather than a live provider call. */
  async recordKycDecision(organisationId: string, tenantId: string, dto: VerifyKycDto) {
    await this.get(organisationId, tenantId);
    return this.db.withTenant(organisationId, (trx) =>
      this.tenantsRepo.update(trx, organisationId, tenantId, {
        kyc_status: dto.outcome,
        kyc_provider: dto.provider,
        kyc_verified_at: dto.outcome === 'verified' ? new Date() : null,
      }),
    );
  }

  /**
   * Resolves a Tenant-role JWT's `sub` (a users.id) to the tenants.id it
   * owns, via tenants.user_id — the link every "may this caller view/create
   * their own X" check across the API needs. Returns null if this login
   * hasn't been granted portal access (see grantPortalAccess) or isn't a
   * tenant login at all.
   */
  async resolveOwnTenantId(organisationId: string, userId: string): Promise<string | null> {
    const tenant = await this.db.withTenant(organisationId, (trx) =>
      this.tenantsRepo.findByUserId(trx, organisationId, userId),
    );
    return tenant?.id ?? null;
  }

  /** Full tenant record for "who am I" — see TenantsController.getOwn. */
  async getOwn(organisationId: string, userId: string) {
    const tenant = await this.db.withTenant(organisationId, (trx) =>
      this.tenantsRepo.findByUserId(trx, organisationId, userId),
    );
    if (!tenant) {
      throw new NotFoundException('Your account is not linked to a tenant record yet');
    }
    return tenant;
  }

  /**
   * Creates the tenant's portal login: a `users` row with the seeded 'Tenant'
   * role, linked back via tenants.user_id. One-shot, like UsersService.create —
   * no accept-invite flow yet, so the temporary password is handed back for
   * the inviting staff member to relay out-of-band.
   */
  async grantPortalAccess(organisationId: string, tenantId: string): Promise<{ user: unknown; temporaryPassword: string }> {
    return this.db.withTenant(organisationId, async (trx) => {
      const tenant = await this.tenantsRepo.findById(trx, organisationId, tenantId);
      if (!tenant) {
        throw new NotFoundException('Tenant not found');
      }
      if (tenant.user_id) {
        throw new ConflictException('This tenant already has portal access');
      }
      if (!tenant.email) {
        throw new BadRequestException('Tenant has no email on file; add one before granting portal access');
      }

      const existingUser = await this.usersRepo.findByEmail(trx, organisationId, tenant.email);
      if (existingUser) {
        throw new ConflictException('A user with this email already exists in this organisation');
      }

      const tenantRole = await this.usersRepo.findRoleByName(trx, organisationId, 'Tenant');
      if (!tenantRole) {
        throw new BadRequestException("No 'Tenant' role exists for this organisation");
      }

      const temporaryPassword = randomBytes(9).toString('base64url');
      const passwordHash = await bcrypt.hash(temporaryPassword, 12);

      const user = await this.usersRepo.create(trx, {
        organisation_id: organisationId,
        full_name: tenant.full_name,
        email: tenant.email,
        phone: tenant.phone ?? null,
        password_hash: passwordHash,
        status: 'active',
      });
      await this.usersRepo.assignRole(trx, user.id, tenantRole.id);
      await this.tenantsRepo.update(trx, organisationId, tenantId, { user_id: user.id });

      const { password_hash: _passwordHash, mfa_secret_encrypted: _mfaSecret, ...safeUser } = user;
      return { user: safeUser, temporaryPassword };
    });
  }
}
