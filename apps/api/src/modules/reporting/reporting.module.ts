import { Module } from '@nestjs/common';
import { PropertyModule } from '../property/property.module';
import { ReportingController } from './controllers/reporting.controller';
import { ReportingService } from './services/reporting.service';
import { ReportingRepository } from './repositories/reporting.repository';

@Module({
  imports: [PropertyModule],
  controllers: [ReportingController],
  providers: [ReportingService, ReportingRepository],
  exports: [ReportingService],
})
export class ReportingModule {}
