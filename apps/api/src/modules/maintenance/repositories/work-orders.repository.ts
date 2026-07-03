import { Injectable } from '@nestjs/common';
import { Insertable, Kysely, Updateable } from 'kysely';
import { Database, WorkOrdersTable } from '../../../database/kysely.types';

type NewWorkOrder = Insertable<WorkOrdersTable>;
type WorkOrderUpdate = Updateable<WorkOrdersTable>;

@Injectable()
export class WorkOrdersRepository {
  async create(db: Kysely<Database>, workOrder: NewWorkOrder) {
    return db.insertInto('work_orders').values(workOrder).returningAll().executeTakeFirstOrThrow();
  }

  async findById(db: Kysely<Database>, organisationId: string, workOrderId: string) {
    return db
      .selectFrom('work_orders')
      .leftJoin('properties', 'properties.id', 'work_orders.property_id')
      .selectAll('work_orders')
      .select('properties.name as property_name')
      .where('work_orders.organisation_id', '=', organisationId)
      .where('work_orders.id', '=', workOrderId)
      .executeTakeFirst();
  }

  async listForProperty(db: Kysely<Database>, organisationId: string, propertyId: string) {
    return db
      .selectFrom('work_orders')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('property_id', '=', propertyId)
      .orderBy('opened_at', 'desc')
      .execute();
  }

  /**
   * `filters.raisedByUserId` narrows to a single reporter's work orders — used to scope a
   * Tenant-role caller to their own. `filters.assignedUserId` narrows to a single internal
   * assignee's work orders — used to scope a MaintenanceStaff-role caller to their jobs.
   * `filters.propertyIds` narrows to a set of properties — used to scope a Landlord-role
   * caller to the ones they own.
   */
  async listByStatus(
    db: Kysely<Database>,
    organisationId: string,
    status: string,
    filters: { raisedByUserId?: string; assignedUserId?: string; propertyIds?: string[] },
    options: { limit: number; offset: number },
  ) {
    let query = db
      .selectFrom('work_orders')
      .leftJoin('properties', 'properties.id', 'work_orders.property_id')
      .selectAll('work_orders')
      .select('properties.name as property_name')
      .where('work_orders.organisation_id', '=', organisationId)
      .where('work_orders.status', '=', status);
    let countQuery = db
      .selectFrom('work_orders')
      .select((eb) => eb.fn.countAll().as('count'))
      .where('organisation_id', '=', organisationId)
      .where('status', '=', status);

    if (filters.raisedByUserId) {
      query = query.where('work_orders.raised_by_user_id', '=', filters.raisedByUserId);
      countQuery = countQuery.where('raised_by_user_id', '=', filters.raisedByUserId);
    }

    if (filters.assignedUserId) {
      query = query.where('work_orders.assigned_user_id', '=', filters.assignedUserId);
      countQuery = countQuery.where('assigned_user_id', '=', filters.assignedUserId);
    }

    if (filters.propertyIds) {
      query = query.where('work_orders.property_id', 'in', filters.propertyIds);
      countQuery = countQuery.where('property_id', 'in', filters.propertyIds);
    }

    const [rows, { count }] = await Promise.all([
      query.orderBy('work_orders.opened_at', 'desc').limit(options.limit).offset(options.offset).execute(),
      countQuery.executeTakeFirstOrThrow(),
    ]);

    return { rows, total: Number(count) };
  }

  async update(db: Kysely<Database>, organisationId: string, workOrderId: string, changes: WorkOrderUpdate) {
    return db
      .updateTable('work_orders')
      .set(changes)
      .where('organisation_id', '=', organisationId)
      .where('id', '=', workOrderId)
      .returningAll()
      .executeTakeFirstOrThrow();
  }

  /** Atomic increment so concurrent part additions on the same work order don't clobber each other's cost. */
  async incrementCost(db: Kysely<Database>, organisationId: string, workOrderId: string, deltaKobo: bigint) {
    return db
      .updateTable('work_orders')
      .set((eb) => ({ cost_kobo: eb('cost_kobo', '+', deltaKobo.toString()) }))
      .where('organisation_id', '=', organisationId)
      .where('id', '=', workOrderId)
      .returningAll()
      .executeTakeFirstOrThrow();
  }
}
