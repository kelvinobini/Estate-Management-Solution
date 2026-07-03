import { Injectable } from '@nestjs/common';
import { Insertable, Kysely } from 'kysely';
import { Database, UsersTable } from '../../../database/kysely.types';

type NewUser = Insertable<UsersTable>;

@Injectable()
export class UsersRepository {
  /** Every staff account in the org, each with the names of every role they hold. */
  async listForOrganisation(db: Kysely<Database>, organisationId: string) {
    const users = await db
      .selectFrom('users')
      .select(['id', 'full_name', 'email', 'phone', 'status', 'mfa_enabled', 'last_login_at'])
      .where('organisation_id', '=', organisationId)
      .where('deleted_at', 'is', null)
      .orderBy('full_name', 'asc')
      .execute();

    const roleRows = await db
      .selectFrom('user_roles')
      .innerJoin('roles', 'roles.id', 'user_roles.role_id')
      .innerJoin('users', 'users.id', 'user_roles.user_id')
      .select(['user_roles.user_id', 'roles.name'])
      .where('users.organisation_id', '=', organisationId)
      .execute();

    const roleNamesByUserId = new Map<string, string[]>();
    for (const row of roleRows) {
      const names = roleNamesByUserId.get(row.user_id) ?? [];
      names.push(row.name);
      roleNamesByUserId.set(row.user_id, names);
    }

    return users.map((user) => ({ ...user, role_names: roleNamesByUserId.get(user.id) ?? [] }));
  }

  async findById(db: Kysely<Database>, organisationId: string, userId: string) {
    return db
      .selectFrom('users')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('id', '=', userId)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();
  }

  async findByEmail(db: Kysely<Database>, organisationId: string, email: string) {
    return db
      .selectFrom('users')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('email', '=', email)
      .where('deleted_at', 'is', null)
      .executeTakeFirst();
  }

  async create(db: Kysely<Database>, user: NewUser) {
    return db.insertInto('users').values(user).returningAll().executeTakeFirstOrThrow();
  }

  async findRoleByName(db: Kysely<Database>, organisationId: string, roleName: string) {
    return db
      .selectFrom('roles')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('name', '=', roleName)
      .executeTakeFirst();
  }

  async listRolesForOrganisation(db: Kysely<Database>, organisationId: string) {
    return db
      .selectFrom('roles')
      .select(['id', 'name'])
      .where('organisation_id', '=', organisationId)
      .orderBy('name', 'asc')
      .execute();
  }

  async assignRole(db: Kysely<Database>, userId: string, roleId: string) {
    await db.insertInto('user_roles').values({ user_id: userId, role_id: roleId }).execute();
  }

  /** Active staff emails holding a given role — used to notify the people responsible (e.g. OrgAdmins) rather than requiring a dedicated "org contact email" setting. */
  async listActiveEmailsByRole(db: Kysely<Database>, organisationId: string, roleName: string): Promise<string[]> {
    const rows = await db
      .selectFrom('users')
      .innerJoin('user_roles', 'user_roles.user_id', 'users.id')
      .innerJoin('roles', 'roles.id', 'user_roles.role_id')
      .select('users.email')
      .where('users.organisation_id', '=', organisationId)
      .where('users.status', '=', 'active')
      .where('users.deleted_at', 'is', null)
      .where('roles.name', '=', roleName)
      .execute();
    return rows.map((row) => row.email);
  }

  async updateStatus(db: Kysely<Database>, organisationId: string, userId: string, status: string) {
    return db
      .updateTable('users')
      .set({ status })
      .where('organisation_id', '=', organisationId)
      .where('id', '=', userId)
      .returningAll()
      .executeTakeFirstOrThrow();
  }
}
