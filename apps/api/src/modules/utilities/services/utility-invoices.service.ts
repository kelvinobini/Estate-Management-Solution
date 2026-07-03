import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TenantDatabaseService } from '../../../database/database.service';
import { multiplyKoboByQuantity, subtractDecimalQuantities } from '../../../common/money.util';
import { InvoicesService } from '../../financial/services/invoices.service';
import { MetersRepository } from '../repositories/meters.repository';
import { MeterReadingsRepository } from '../repositories/meter-readings.repository';
import { UtilityInvoicesRepository } from '../repositories/utility-invoices.repository';
import { GenerateUtilityInvoiceDto } from '../dto/generate-utility-invoice.dto';

const METER_TYPE_LABELS: Record<string, string> = {
  electricity: 'Electricity',
  water: 'Water',
  gas: 'Gas',
  generator_diesel: 'Generator diesel',
};

/**
 * Depends directly on Financial's InvoicesService (a normal Nest
 * module-to-module dependency, not the event bus): generating a utility
 * bill is this module proactively orchestrating "compute a charge and also
 * create the tenant invoice for it," which is a single use case — different
 * from the lease.signed event, which is a reactive side-effect of another
 * module's state change. See docs/01-architecture.md section 3.
 */
@Injectable()
export class UtilityInvoicesService {
  constructor(
    private readonly db: TenantDatabaseService,
    private readonly metersRepo: MetersRepository,
    private readonly readingsRepo: MeterReadingsRepository,
    private readonly utilityInvoicesRepo: UtilityInvoicesRepository,
    private readonly invoicesService: InvoicesService,
  ) {}

  async generate(organisationId: string, meterId: string, dto: GenerateUtilityInvoiceDto) {
    const periodStart = new Date(dto.periodStart);
    const periodEnd = new Date(dto.periodEnd);
    if (periodEnd <= periodStart) {
      throw new BadRequestException('periodEnd must be after periodStart');
    }

    return this.db.withTenant(organisationId, async (trx) => {
      const meter = await this.metersRepo.findById(trx, organisationId, meterId);
      if (!meter) {
        throw new NotFoundException('Meter not found');
      }

      const startReading = await this.readingsRepo.findLatestAsOf(trx, organisationId, meterId, periodStart);
      const endReading = await this.readingsRepo.findLatestAsOf(trx, organisationId, meterId, periodEnd);
      if (!startReading || !endReading) {
        throw new BadRequestException('Insufficient meter readings to bill this period');
      }

      const consumption = subtractDecimalQuantities(endReading.reading_value, startReading.reading_value, 3);
      if (Number(consumption) < 0) {
        throw new BadRequestException('Computed consumption is negative — check for out-of-order meter readings');
      }

      const amountKobo = multiplyKoboByQuantity(meter.unit_rate_kobo, consumption, 3);

      const utilityInvoice = await this.utilityInvoicesRepo.create(trx, {
        organisation_id: organisationId,
        meter_id: meterId,
        period_start: periodStart,
        period_end: periodEnd,
        consumption,
        amount_kobo: amountKobo.toString(),
      });

      if (!dto.tenantId) {
        return utilityInvoice; // bulk/reconciliation meter — no tenant to bill
      }

      const invoice = await this.invoicesService.createInvoiceTx(trx, organisationId, {
        unitId: meter.unit_id ?? undefined,
        tenantId: dto.tenantId,
        invoiceType: 'utility',
        dueDate: dto.periodEnd,
        lineItems: [
          {
            description: `${METER_TYPE_LABELS[meter.meter_type] ?? meter.meter_type} usage: ${consumption} units (${dto.periodStart} to ${dto.periodEnd})`,
            quantity: '1',
            unitPriceKobo: amountKobo.toString(),
          },
        ],
      });

      return this.utilityInvoicesRepo.update(trx, organisationId, utilityInvoice.id, { invoice_id: invoice.id });
    });
  }

  async listForMeter(organisationId: string, meterId: string) {
    return this.db.withTenant(organisationId, (trx) => this.utilityInvoicesRepo.listForMeter(trx, organisationId, meterId));
  }
}
