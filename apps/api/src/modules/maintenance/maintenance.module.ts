import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PropertyModule } from '../property/property.module';
import { LeaseModule } from '../lease/lease.module';
import { VendorsController } from './controllers/vendors.controller';
import { AssetsController } from './controllers/assets.controller';
import { WorkOrdersController } from './controllers/work-orders.controller';
import { InventoryItemsController } from './controllers/inventory-items.controller';
import { VendorsService } from './services/vendors.service';
import { AssetsService } from './services/assets.service';
import { MaintenanceSchedulesService } from './services/maintenance-schedules.service';
import { WorkOrdersService } from './services/work-orders.service';
import { InventoryItemsService } from './services/inventory-items.service';
import { VendorsRepository } from './repositories/vendors.repository';
import { AssetsRepository } from './repositories/assets.repository';
import { MaintenanceSchedulesRepository } from './repositories/maintenance-schedules.repository';
import { WorkOrdersRepository } from './repositories/work-orders.repository';
import { WorkOrderPartsRepository } from './repositories/work-order-parts.repository';
import { InventoryItemsRepository } from './repositories/inventory-items.repository';
import { PreventiveMaintenanceProcessor } from './jobs/preventive-maintenance.processor';
import { PREVENTIVE_MAINTENANCE_QUEUE } from './maintenance.tokens';

export { PREVENTIVE_MAINTENANCE_QUEUE };

@Module({
  imports: [BullModule.registerQueue({ name: PREVENTIVE_MAINTENANCE_QUEUE }), PropertyModule, LeaseModule],
  controllers: [VendorsController, AssetsController, WorkOrdersController, InventoryItemsController],
  providers: [
    VendorsService,
    AssetsService,
    MaintenanceSchedulesService,
    WorkOrdersService,
    InventoryItemsService,
    VendorsRepository,
    AssetsRepository,
    MaintenanceSchedulesRepository,
    WorkOrdersRepository,
    WorkOrderPartsRepository,
    InventoryItemsRepository,
    PreventiveMaintenanceProcessor,
  ],
  exports: [VendorsService, AssetsService, WorkOrdersService],
})
export class MaintenanceModule {}
