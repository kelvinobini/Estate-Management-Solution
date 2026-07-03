import { Body, Controller, Get, HttpCode, Ip, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtClaims } from '../../../common/interfaces/authenticated-request.interface';
import { InquiriesService } from '../services/inquiries.service';
import { CreateInquiryDto } from '../dto/create-inquiry.dto';
import { UpdateInquiryStatusDto } from '../dto/update-inquiry-status.dto';

@Controller('inquiries')
export class InquiriesController {
  constructor(private readonly inquiriesService: InquiriesService) {}

  /**
   * Deliberately no guards at all — this is the public "request access" form
   * on the marketing landing page, submitted before the visitor has any
   * account. It only ever creates an `inquiries` row for staff to review; it
   * never issues a login. Rate-limited by IP and email in the service since
   * it's an unauthenticated, internet-facing write endpoint.
   */
  @Post()
  @HttpCode(202)
  async submit(@Body() dto: CreateInquiryDto, @Ip() ip: string): Promise<void> {
    await this.inquiriesService.submit(dto, ip);
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('inquiry.read')
  listAll(
    @CurrentUser() user: JwtClaims,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.inquiriesService.listForOrganisation(user.organisation_id, status, {
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
    });
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('inquiry.update')
  updateStatus(@CurrentUser() user: JwtClaims, @Param('id') id: string, @Body() dto: UpdateInquiryStatusDto) {
    return this.inquiriesService.updateStatus(user.organisation_id, id, dto);
  }
}
