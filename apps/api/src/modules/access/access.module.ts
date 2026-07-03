import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ComplianceModule } from '../compliance/compliance.module';
import { LeaseModule } from '../lease/lease.module';
import { VehiclesController } from './controllers/vehicles.controller';
import { VisitorsController } from './controllers/visitors.controller';
import { GatePassesController } from './controllers/gate-passes.controller';
import { GuardsController } from './controllers/guards.controller';
import { IncidentsController } from './controllers/incidents.controller';
import { VehiclesService } from './services/vehicles.service';
import { VisitorsService } from './services/visitors.service';
import { GatePassesService } from './services/gate-passes.service';
import { GuardsService } from './services/guards.service';
import { GuardShiftsService } from './services/guard-shifts.service';
import { IncidentsService } from './services/incidents.service';
import { VehiclesRepository } from './repositories/vehicles.repository';
import { VisitorsRepository } from './repositories/visitors.repository';
import { GatePassesRepository } from './repositories/gate-passes.repository';
import { GuardsRepository } from './repositories/guards.repository';
import { GuardShiftsRepository } from './repositories/guard-shifts.repository';
import { PatrolLogsRepository } from './repositories/patrol-logs.repository';
import { IncidentsRepository } from './repositories/incidents.repository';
import { GatePassExpiryProcessor } from './jobs/gate-pass-expiry.processor';
import { GATE_PASS_EXPIRY_QUEUE } from './access.tokens';

export { GATE_PASS_EXPIRY_QUEUE };

@Module({
  imports: [BullModule.registerQueue({ name: GATE_PASS_EXPIRY_QUEUE }), ComplianceModule, LeaseModule],
  controllers: [VehiclesController, VisitorsController, GatePassesController, GuardsController, IncidentsController],
  providers: [
    VehiclesService,
    VisitorsService,
    GatePassesService,
    GuardsService,
    GuardShiftsService,
    IncidentsService,
    VehiclesRepository,
    VisitorsRepository,
    GatePassesRepository,
    GuardsRepository,
    GuardShiftsRepository,
    PatrolLogsRepository,
    IncidentsRepository,
    GatePassExpiryProcessor,
  ],
  exports: [VisitorsService, GatePassesService],
})
export class AccessModule {}
