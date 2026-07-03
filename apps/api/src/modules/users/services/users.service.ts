import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { TenantDatabaseService } from '../../../database/database.service';
import { UsersRepository } from '../repositories/users.repository';
import { CreateUserDto } from '../dto/create-user.dto';

/**
 * There is no email/SMS integration yet (see docs/01-architecture.md section
 * 11, Integrations — same gap as announcement dispatch), so invitation is a
 * one-shot: a random temporary password is generated and handed back in the
 * API response for the inviting admin to relay out-of-band. The account is
 * created in 'active' status (not 'invited') since there's no separate
 * "accept invite" flow for the user to transition through yet.
 */
@Injectable()
export class UsersService {
  constructor(
    private readonly db: TenantDatabaseService,
    private readonly usersRepo: UsersRepository,
  ) {}

  async create(organisationId: string, dto: CreateUserDto): Promise<{ user: unknown; temporaryPassword: string }> {
    return this.db.withTenant(organisationId, async (trx) => {
      const existing = await this.usersRepo.findByEmail(trx, organisationId, dto.email);
      if (existing) {
        throw new ConflictException('A user with this email already exists in this organisation');
      }

      const role = await this.usersRepo.findRoleByName(trx, organisationId, dto.roleName);
      if (!role) {
        throw new BadRequestException(`No role named '${dto.roleName}' exists for this organisation`);
      }

      const temporaryPassword = randomBytes(9).toString('base64url');
      const passwordHash = await bcrypt.hash(temporaryPassword, 12);

      const user = await this.usersRepo.create(trx, {
        organisation_id: organisationId,
        full_name: dto.fullName,
        email: dto.email,
        phone: dto.phone ?? null,
        password_hash: passwordHash,
        status: 'active',
      });

      await this.usersRepo.assignRole(trx, user.id, role.id);

      const { password_hash: _passwordHash, mfa_secret_encrypted: _mfaSecret, ...safeUser } = user;
      return { user: safeUser, temporaryPassword };
    });
  }

  async list(organisationId: string) {
    return this.db.withTenant(organisationId, (trx) => this.usersRepo.listForOrganisation(trx, organisationId));
  }

  async listRoles(organisationId: string) {
    return this.db.withTenant(organisationId, (trx) => this.usersRepo.listRolesForOrganisation(trx, organisationId));
  }

  async updateStatus(organisationId: string, callerUserId: string, userId: string, status: 'active' | 'suspended') {
    if (status === 'suspended' && callerUserId === userId) {
      throw new BadRequestException('You cannot suspend your own account');
    }

    return this.db.withTenant(organisationId, async (trx) => {
      const existing = await this.usersRepo.findById(trx, organisationId, userId);
      if (!existing) {
        throw new NotFoundException('User not found');
      }

      const updated = await this.usersRepo.updateStatus(trx, organisationId, userId, status);
      const { password_hash: _passwordHash, mfa_secret_encrypted: _mfaSecret, ...safeUser } = updated;
      return safeUser;
    });
  }
}
