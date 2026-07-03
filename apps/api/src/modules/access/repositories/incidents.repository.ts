import { Injectable } from '@nestjs/common';
import { Insertable, Kysely, Updateable } from 'kysely';
import { Database, IncidentsTable } from '../../../database/kysely.types';

type NewIncident = Insertable<IncidentsTable>;
type IncidentUpdate = Updateable<IncidentsTable>;

@Injectable()
export class IncidentsRepository {
  async create(db: Kysely<Database>, incident: NewIncident) {
    return db.insertInto('incidents').values(incident).returningAll().executeTakeFirstOrThrow();
  }

  async findById(db: Kysely<Database>, organisationId: string, incidentId: string) {
    return db
      .selectFrom('incidents')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('id', '=', incidentId)
      .executeTakeFirst();
  }

  async listForProperty(db: Kysely<Database>, organisationId: string, propertyId: string) {
    return db
      .selectFrom('incidents')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('property_id', '=', propertyId)
      .orderBy('occurred_at', 'desc')
      .execute();
  }

  /** Org-wide, optionally status-filtered listing for the staff security log. */
  async listForOrganisation(
    db: Kysely<Database>,
    organisationId: string,
    status: string | undefined,
    options: { limit: number; offset: number },
  ) {
    let query = db
      .selectFrom('incidents')
      .innerJoin('properties', 'properties.id', 'incidents.property_id')
      .selectAll('incidents')
      .select('properties.name as property_name')
      .where('incidents.organisation_id', '=', organisationId);
    let countQuery = db
      .selectFrom('incidents')
      .select((eb) => eb.fn.countAll().as('count'))
      .where('organisation_id', '=', organisationId);

    if (status) {
      query = query.where('incidents.status', '=', status);
      countQuery = countQuery.where('status', '=', status);
    }

    const [rows, { count }] = await Promise.all([
      query.orderBy('incidents.occurred_at', 'desc').limit(options.limit).offset(options.offset).execute(),
      countQuery.executeTakeFirstOrThrow(),
    ]);

    return { rows, total: Number(count) };
  }

  async update(db: Kysely<Database>, organisationId: string, incidentId: string, changes: IncidentUpdate) {
    return db
      .updateTable('incidents')
      .set(changes)
      .where('organisation_id', '=', organisationId)
      .where('id', '=', incidentId)
      .returningAll()
      .executeTakeFirstOrThrow();
  }
}
