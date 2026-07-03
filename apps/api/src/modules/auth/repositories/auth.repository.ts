import { Injectable } from '@nestjs/common';
import { Kysely } from 'kysely';
import { Database } from '../../../database/kysely.types';

@Injectable()
export class AuthRepository {
  async findOrganisationBySlug(db: Kysely<Database>, slug: string) {
    return db
      .selectFrom('organisations')
      .selectAll()
      .where('slug', '=', slug)
      .where('is_active', '=', true)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();
  }

  async findActiveUserByEmail(db: Kysely<Database>, organisationId: string, email: string) {
    return db
      .selectFrom('users')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('email', '=', email)
      .where('status', '=', 'active')
      .where('deleted_at', 'is', null)
      .executeTakeFirst();
  }

  async findById(db: Kysely<Database>, userId: string) {
    return db.selectFrom('users').selectAll().where('id', '=', userId).where('deleted_at', 'is', null).executeTakeFirst();
  }

  /** Role names granted to the user, e.g. ['OrgAdmin']. A user may hold more than one. */
  async findRoleNamesForUser(db: Kysely<Database>, userId: string): Promise<string[]> {
    const rows = await db
      .selectFrom('user_roles')
      .innerJoin('roles', 'roles.id', 'user_roles.role_id')
      .select('roles.name')
      .where('user_roles.user_id', '=', userId)
      .execute();
    return rows.map((r) => r.name);
  }

  /** Flattened, de-duplicated permission codes across every role the user holds. */
  async findPermissionCodesForUser(db: Kysely<Database>, userId: string): Promise<string[]> {
    const rows = await db
      .selectFrom('user_roles')
      .innerJoin('role_permissions', 'role_permissions.role_id', 'user_roles.role_id')
      .innerJoin('permissions', 'permissions.id', 'role_permissions.permission_id')
      .select('permissions.code')
      .distinct()
      .where('user_roles.user_id', '=', userId)
      .execute();
    return rows.map((r) => r.code);
  }

  async updateLastLogin(db: Kysely<Database>, userId: string) {
    return db.updateTable('users').set({ last_login_at: new Date() }).where('id', '=', userId).execute();
  }

  async setMfaSecret(db: Kysely<Database>, userId: string, encryptedSecret: string) {
    return db.updateTable('users').set({ mfa_secret_encrypted: encryptedSecret }).where('id', '=', userId).execute();
  }

  async enableMfa(db: Kysely<Database>, userId: string) {
    return db.updateTable('users').set({ mfa_enabled: true }).where('id', '=', userId).execute();
  }
}
