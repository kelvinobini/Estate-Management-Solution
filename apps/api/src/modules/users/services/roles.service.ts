import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { TenantDatabaseService } from '../../../database/database.service';
import { RolesRepository } from '../repositories/roles.repository';
import { UsersRepository } from '../repositories/users.repository';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRolePermissionsDto } from '../dto/update-role-permissions.dto';

/**
 * The OrgAdmin role is excluded from permission edits: it's the role every
 * seeded admin account holds, granted the full permission catalog
 * automatically (see seed.ts ALL_PERMISSION_CODES). Letting it be edited
 * risks an org admin stripping their own role of role.manage (or everything
 * else) with no recovery path, since there's no separate platform-level
 * reset for a locked-out organisation.
 */
const IMMUTABLE_ROLE_NAME = 'OrgAdmin';

@Injectable()
export class RolesService {
  constructor(
    private readonly db: TenantDatabaseService,
    private readonly rolesRepo: RolesRepository,
    private readonly usersRepo: UsersRepository,
  ) {}

  async listPermissions() {
    return this.db.runAsService((trx) => this.rolesRepo.listPermissions(trx));
  }

  async listRoles(organisationId: string) {
    return this.db.withTenant(organisationId, async (trx) => {
      const roles = await this.rolesRepo.listRoles(trx, organisationId);
      if (roles.length === 0) return [];

      const permissionRows = await this.rolesRepo.listPermissionCodesForRoles(
        trx,
        roles.map((role) => role.id),
      );
      const codesByRoleId = new Map<string, string[]>();
      for (const row of permissionRows) {
        const codes = codesByRoleId.get(row.role_id) ?? [];
        codes.push(row.code);
        codesByRoleId.set(row.role_id, codes);
      }

      return roles.map((role) => ({
        ...role,
        permissionCodes: codesByRoleId.get(role.id) ?? [],
        isEditable: role.name !== IMMUTABLE_ROLE_NAME,
      }));
    });
  }

  async createRole(organisationId: string, dto: CreateRoleDto) {
    return this.db.withTenant(organisationId, async (trx) => {
      const existing = await this.usersRepo.findRoleByName(trx, organisationId, dto.name);
      if (existing) {
        throw new ConflictException(`A role named '${dto.name}' already exists in this organisation`);
      }

      const permissions = await this.rolesRepo.findPermissionsByCodes(trx, dto.permissionCodes);
      if (permissions.length !== new Set(dto.permissionCodes).size) {
        throw new BadRequestException('One or more permission codes do not exist');
      }

      const role = await this.rolesRepo.createRole(trx, organisationId, dto.name);
      await this.rolesRepo.replaceRolePermissions(
        trx,
        role.id,
        permissions.map((permission) => permission.id),
      );

      return { ...role, permissionCodes: permissions.map((permission) => permission.code) };
    });
  }

  async updateRolePermissions(organisationId: string, roleId: string, dto: UpdateRolePermissionsDto) {
    return this.db.withTenant(organisationId, async (trx) => {
      const role = await this.rolesRepo.findRoleById(trx, organisationId, roleId);
      if (!role) {
        throw new NotFoundException('Role not found');
      }
      if (role.name === IMMUTABLE_ROLE_NAME) {
        throw new BadRequestException(`The ${IMMUTABLE_ROLE_NAME} role's permissions cannot be modified`);
      }

      const permissions = await this.rolesRepo.findPermissionsByCodes(trx, dto.permissionCodes);
      if (permissions.length !== new Set(dto.permissionCodes).size) {
        throw new BadRequestException('One or more permission codes do not exist');
      }

      await this.rolesRepo.replaceRolePermissions(
        trx,
        role.id,
        permissions.map((permission) => permission.id),
      );

      return { ...role, permissionCodes: permissions.map((permission) => permission.code) };
    });
  }
}
