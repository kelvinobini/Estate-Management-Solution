import { Module } from '@nestjs/common';
import { FinancialModule } from '../financial/financial.module';
import { MetersController } from './controllers/meters.controller';
import { MetersService } from './services/meters.service';
import { MeterReadingsService } from './services/meter-readings.service';
import { UtilityInvoicesService } from './services/utility-invoices.service';
import { MetersRepository } from './repositories/meters.repository';
import { MeterReadingsRepository } from './repositories/meter-readings.repository';
import { UtilityInvoicesRepository } from './repositories/utility-invoices.repository';

@Module({
  imports: [FinancialModule],
  controllers: [MetersController],
  providers: [MetersService, MeterReadingsService, UtilityInvoicesService, MetersRepository, MeterReadingsRepository, UtilityInvoicesRepository],
  exports: [MetersService, UtilityInvoicesService],
})
export class UtilitiesModule {}
