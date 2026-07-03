import { Injectable } from '@nestjs/common';
import { Insertable, Kysely } from 'kysely';
import { Database, WorkOrderPartsTable } from '../../../database/kysely.types';

type NewWorkOrderPart = Insertable<WorkOrderPartsTable>;

@Injectable()
export class WorkOrderPartsRepository {
  async create(db: Kysely<Database>, part: NewWorkOrderPart) {
    return db.insertInto('work_order_parts').values(part).returningAll().executeTakeFirstOrThrow();
  }

  async listForWorkOrder(db: Kysely<Database>, workOrderId: string) {
    return db.selectFrom('work_order_parts').selectAll().where('work_order_id', '=', workOrderId).execute();
  }
}
