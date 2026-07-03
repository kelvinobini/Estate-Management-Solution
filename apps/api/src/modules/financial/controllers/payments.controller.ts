import { Body, Controller, ForbiddenException, Headers, HttpCode, Post, RawBodyRequest, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtClaims } from '../../../common/interfaces/authenticated-request.interface';
import { PaymentsService } from '../services/payments.service';
import { InvoicesService } from '../services/invoices.service';
import { TenantsService } from '../../lease/services/tenants.service';
import { InitiatePaystackPaymentDto, RecordManualPaymentDto } from '../dto/record-payment.dto';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly invoicesService: InvoicesService,
    private readonly tenantsService: TenantsService,
  ) {}

  @Post('paystack/initiate')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('payment.create')
  async initiatePaystack(@CurrentUser() user: JwtClaims, @Body() dto: InitiatePaystackPaymentDto) {
    if (user.role === 'Tenant') {
      const invoice = await this.invoicesService.getInvoice(user.organisation_id, dto.invoiceId);
      const ownTenantId = await this.tenantsService.resolveOwnTenantId(user.organisation_id, user.sub);
      if (!ownTenantId || ownTenantId !== invoice.tenant_id) {
        throw new ForbiddenException('Tenants may only pay their own invoices');
      }
    }
    return this.paymentsService.initiatePaystackPayment(user.organisation_id, dto);
  }

  @Post('manual')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('payment.record_manual')
  recordManual(@CurrentUser() user: JwtClaims, @Body() dto: RecordManualPaymentDto) {
    return this.paymentsService.recordManualPayment(user.organisation_id, dto);
  }

  /**
   * Paystack webhook receiver. Deliberately unauthenticated by JWT — trust is
   * established entirely by the HMAC signature check inside the service.
   */
  @Post('paystack/webhook')
  @HttpCode(200)
  async handleWebhook(@Req() req: RawBodyRequest<Request>, @Headers('x-paystack-signature') signature: string) {
    const rawBody = req.rawBody?.toString('utf8') ?? '';
    await this.paymentsService.handlePaystackWebhook(rawBody, signature);
    return { received: true };
  }
}
