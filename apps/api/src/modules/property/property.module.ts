import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { PropertiesController } from './controllers/properties.controller';
import { BlocksController } from './controllers/blocks.controller';
import { FloorsController } from './controllers/floors.controller';
import { UnitsController } from './controllers/units.controller';
import { PropertiesService } from './services/properties.service';
import { BlocksService } from './services/blocks.service';
import { FloorsService } from './services/floors.service';
import { UnitsService } from './services/units.service';
import { PropertiesRepository } from './repositories/properties.repository';
import { BlocksRepository } from './repositories/blocks.repository';
import { FloorsRepository } from './repositories/floors.repository';
import { UnitsRepository } from './repositories/units.repository';
import { UnitMediaRepository } from './repositories/unit-media.repository';
import { LeaseUnitStatusListener } from './services/lease-unit-status.listener';

@Module({
  imports: [UsersModule],
  controllers: [PropertiesController, BlocksController, FloorsController, UnitsController],
  providers: [
    PropertiesService,
    BlocksService,
    FloorsService,
    UnitsService,
    PropertiesRepository,
    BlocksRepository,
    FloorsRepository,
    UnitsRepository,
    UnitMediaRepository,
    LeaseUnitStatusListener,
  ],
  exports: [PropertiesService, UnitsService],
})
export class PropertyModule {}
