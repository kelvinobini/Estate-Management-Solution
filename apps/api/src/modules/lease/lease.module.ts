import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ComplianceModule } from '../compliance/compliance.module';
import { UsersModule } from '../users/users.module';
import { PropertyModule } from '../property/property.module';
import { TenantsController } from './controllers/tenants.controller';
import { LeasesController } from './controllers/leases.controller';
import { TenantsService } from './services/tenants.service';
import { LeasesService } from './services/leases.service';
import { TenantsRepository } from './repositories/tenants.repository';
import { LeasesRepository } from './repositories/leases.repository';
import { LeaseTenantsRepository } from './repositories/lease-tenants.repository';
import { LeaseClausesRepository } from './repositories/lease-clauses.repository';
import { LeaseExpiryProcessor } from './jobs/lease-expiry.processor';
import { LEASE_EXPIRY_QUEUE } from './lease.tokens';

export { LEASE_EXPIRY_QUEUE };

@Module({
  imports: [BullModule.registerQueue({ name: LEASE_EXPIRY_QUEUE }), ComplianceModule, UsersModule, PropertyModule],
  controllers: [TenantsController, LeasesController],
  providers: [
    TenantsService,
    LeasesService,
    TenantsRepository,
    LeasesRepository,
    LeaseTenantsRepository,
    LeaseClausesRepository,
    LeaseExpiryProcessor,
  ],
  exports: [TenantsService, LeasesService, TenantsRepository],
})
export class LeaseModule {}
