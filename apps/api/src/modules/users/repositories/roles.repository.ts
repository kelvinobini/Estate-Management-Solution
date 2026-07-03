import { Injectable } from '@nestjs/common';
import { Kysely } from 'kysely';
import { Database } from '../../../database/kysely.types';

@Injectable()
export class RolesRepository {
  async listPermissions(db: Kysely<Database>) {
    return db.selectFrom('permissions').select(['id', 'code', 'module', 'description']).orderBy('module', 'asc').orderBy('code', 'asc').execute();
  }

  async findPermissionsByCodes(db: Kysely<Database>, codes: string[]) {
    return db.selectFrom('permissions').select(['id', 'code']).where('code', 'in', codes).execute();
  }

  /** Org-scoped roles only (excludes the global, organisation_id-null SuperAdmin role). */
  async listRoles(db: Kysely<Database>, organisationId: string) {
    return db
      .selectFrom('roles')
      .select(['id', 'name'])
      .where('organisation_id', '=', organisationId)
      .orderBy('name', 'asc')
      .execute();
  }

  async findRoleById(db: Kysely<Database>, organisationId: string, roleId: string) {
    return db
      .selectFrom('roles')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('id', '=', roleId)
      .executeTakeFirst();
  }

  async listPermissionCodesForRoles(db: Kysely<Database>, roleIds: string[]) {
    return db
      .selectFrom('role_permissions')
      .innerJoin('permissions', 'permissions.id', 'role_permissions.permission_id')
      .select(['role_permissions.role_id', 'permissions.code'])
      .where('role_permissions.role_id', 'in', roleIds)
      .execute();
  }

  async createRole(db: Kysely<Database>, organisationId: string, name: string) {
    return db
      .insertInto('roles')
      .values({ organisation_id: organisationId, name, is_system_role: false })
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  async replaceRolePermissions(db: Kysely<Database>, roleId: string, permissionIds: string[]) {
    await db.deleteFrom('role_permissions').where('role_id', '=', roleId).execute();
    if (permissionIds.length > 0) {
      await db
        .insertInto('role_permissions')
        .values(permissionIds.map((permissionId) => ({ role_id: roleId, permission_id: permissionId })))
        .execute();
    }
  }
}
