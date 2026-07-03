import { Injectable } from '@nestjs/common';
import { Insertable, Kysely, Updateable } from 'kysely';
import { Database, GatePassesTable } from '../../../database/kysely.types';

type NewGatePass = Insertable<GatePassesTable>;
type GatePassUpdate = Updateable<GatePassesTable>;

@Injectable()
export class GatePassesRepository {
  async create(db: Kysely<Database>, gatePass: NewGatePass) {
    return db.insertInto('gate_passes').values(gatePass).returningAll().executeTakeFirstOrThrow();
  }

  async findById(db: Kysely<Database>, organisationId: string, gatePassId: string) {
    return db
      .selectFrom('gate_passes')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('id', '=', gatePassId)
      .executeTakeFirst();
  }

  async findByOtpOrQrPayload(db: Kysely<Database>, organisationId: string, identifier: string) {
    return db
      .selectFrom('gate_passes')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where((eb) => eb.or([eb('otp_code', '=', identifier), eb('qr_payload', '=', identifier)]))
      .executeTakeFirst();
  }

  async listForVisitor(db: Kysely<Database>, organisationId: string, visitorId: string) {
    return db
      .selectFrom('gate_passes')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('visitor_id', '=', visitorId)
      .orderBy('created_at', 'desc')
      .execute();
  }

  /** Org-wide, status-filtered listing for the gate/front-desk log, joined with the visitor's name. */
  async listByStatus(db: Kysely<Database>, organisationId: string, status: string, options: { limit: number; offset: number }) {
    const [rows, { count }] = await Promise.all([
      db
        .selectFrom('gate_passes')
        .innerJoin('visitors', 'visitors.id', 'gate_passes.visitor_id')
        .selectAll('gate_passes')
        .select('visitors.full_name as visitor_name')
        .where('gate_passes.organisation_id', '=', organisationId)
        .where('gate_passes.status', '=', status)
        .orderBy('gate_passes.created_at', 'desc')
        .limit(options.limit)
        .offset(options.offset)
        .execute(),
      db
        .selectFrom('gate_passes')
        .select((eb) => eb.fn.countAll().as('count'))
        .where('organisation_id', '=', organisationId)
        .where('status', '=', status)
        .executeTakeFirstOrThrow(),
    ]);

    return { rows, total: Number(count) };
  }

  async listExpirable(db: Kysely<Database>, organisationId: string, asOf: Date) {
    return db
      .selectFrom('gate_passes')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('status', '=', 'issued')
      .where('valid_until', '<', asOf)
      .execute();
  }

  async update(db: Kysely<Database>, organisationId: string, gatePassId: string, changes: GatePassUpdate) {
    return db
      .updateTable('gate_passes')
      .set(changes)
      .where('organisation_id', '=', organisationId)
      .where('id', '=', gatePassId)
      .returningAll()
      .executeTakeFirstOrThrow();
  }
}
