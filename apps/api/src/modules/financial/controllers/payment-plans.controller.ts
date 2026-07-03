import { Body, Controller, ForbiddenException, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtClaims } from '../../../common/interfaces/authenticated-request.interface';
import { PaymentPlansService } from '../services/payment-plans.service';
import { InvoicesService } from '../services/invoices.service';
import { TenantsService } from '../../lease/services/tenants.service';
import { CreatePaymentPlanDto } from '../dto/create-payment-plan.dto';

@Controller('payment-plans')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PaymentPlansController {
  constructor(
    private readonly paymentPlansService: PaymentPlansService,
    private readonly invoicesService: InvoicesService,
    private readonly tenantsService: TenantsService,
  ) {}

  @Post()
  @RequirePermissions('payment_plan.create')
  create(@CurrentUser() user: JwtClaims, @Body() dto: CreatePaymentPlanDto) {
    return this.paymentPlansService.createPlan(user.organisation_id, dto);
  }

  @Get('invoice/:invoiceId')
  @RequirePermissions('payment_plan.read')
  async list(@CurrentUser() user: JwtClaims, @Param('invoiceId') invoiceId: string) {
    const invoice = await this.invoicesService.getInvoice(user.organisation_id, invoiceId);
    if (user.role === 'Tenant') {
      const ownTenantId = await this.tenantsService.resolveOwnTenantId(user.organisation_id, user.sub);
      if (!ownTenantId || ownTenantId !== invoice.tenant_id) {
        throw new ForbiddenException('Tenants may only view their own payment plans');
      }
    }
    return this.paymentPlansService.listForInvoice(user.organisation_id, invoiceId);
  }
}
