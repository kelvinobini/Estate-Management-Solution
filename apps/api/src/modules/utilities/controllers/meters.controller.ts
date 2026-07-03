import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtClaims } from '../../../common/interfaces/authenticated-request.interface';
import { MetersService } from '../services/meters.service';
import { MeterReadingsService } from '../services/meter-readings.service';
import { UtilityInvoicesService } from '../services/utility-invoices.service';
import { CreateMeterDto } from '../dto/create-meter.dto';
import { RecordMeterReadingDto } from '../dto/record-meter-reading.dto';
import { GenerateUtilityInvoiceDto } from '../dto/generate-utility-invoice.dto';

@Controller('meters')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MetersController {
  constructor(
    private readonly metersService: MetersService,
    private readonly readingsService: MeterReadingsService,
    private readonly utilityInvoicesService: UtilityInvoicesService,
  ) {}

  @Post()
  @RequirePermissions('meter.create')
  create(@CurrentUser() user: JwtClaims, @Body() dto: CreateMeterDto) {
    return this.metersService.create(user.organisation_id, dto);
  }

  @Get('property/:propertyId')
  @RequirePermissions('meter.read')
  listForProperty(@CurrentUser() user: JwtClaims, @Param('propertyId') propertyId: string) {
    return this.metersService.listForProperty(user.organisation_id, propertyId);
  }

  @Get('unit/:unitId')
  @RequirePermissions('meter.read')
  listForUnit(@CurrentUser() user: JwtClaims, @Param('unitId') unitId: string) {
    return this.metersService.listForUnit(user.organisation_id, unitId);
  }

  @Get(':id')
  @RequirePermissions('meter.read')
  get(@CurrentUser() user: JwtClaims, @Param('id') id: string) {
    return this.metersService.get(user.organisation_id, id);
  }

  @Post(':id/readings')
  @RequirePermissions('meter_reading.create')
  recordReading(@CurrentUser() user: JwtClaims, @Param('id') meterId: string, @Body() dto: RecordMeterReadingDto) {
    return this.readingsService.record(user.organisation_id, meterId, dto);
  }

  @Get(':id/readings')
  @RequirePermissions('meter_reading.read')
  listReadings(@CurrentUser() user: JwtClaims, @Param('id') meterId: string) {
    return this.readingsService.listForMeter(user.organisation_id, meterId);
  }

  @Post(':id/utility-invoices')
  @RequirePermissions('utility_invoice.generate')
  generateUtilityInvoice(@CurrentUser() user: JwtClaims, @Param('id') meterId: string, @Body() dto: GenerateUtilityInvoiceDto) {
    return this.utilityInvoicesService.generate(user.organisation_id, meterId, dto);
  }

  @Get(':id/utility-invoices')
  @RequirePermissions('utility_invoice.read')
  listUtilityInvoices(@CurrentUser() user: JwtClaims, @Param('id') meterId: string) {
    return this.utilityInvoicesService.listForMeter(user.organisation_id, meterId);
  }
}
