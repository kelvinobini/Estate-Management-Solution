import { Injectable } from '@nestjs/common';
import { Insertable, Kysely } from 'kysely';
import { Database, VehiclesTable } from '../../../database/kysely.types';

type NewVehicle = Insertable<VehiclesTable>;

@Injectable()
export class VehiclesRepository {
  async create(db: Kysely<Database>, vehicle: NewVehicle) {
    return db.insertInto('vehicles').values(vehicle).returningAll().executeTakeFirstOrThrow();
  }

  async findById(db: Kysely<Database>, organisationId: string, vehicleId: string) {
    return db.selectFrom('vehicles').selectAll().where('organisation_id', '=', organisationId).where('id', '=', vehicleId).executeTakeFirst();
  }

  async findByPlateNumber(db: Kysely<Database>, organisationId: string, plateNumber: string) {
    return db
      .selectFrom('vehicles')
      .selectAll()
      .where('organisation_id', '=', organisationId)
      .where('plate_number', '=', plateNumber)
      .executeTakeFirst();
  }

  async listForTenant(db: Kysely<Database>, organisationId: string, tenantId: string) {
    return db.selectFrom('vehicles').selectAll().where('organisation_id', '=', organisationId).where('tenant_id', '=', tenantId).execute();
  }
}
