import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtClaims } from '../../../common/interfaces/authenticated-request.interface';
import { AnnouncementsService } from '../services/announcements.service';
import { CreateAnnouncementDto } from '../dto/create-announcement.dto';

@Controller('announcements')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Post()
  @RequirePermissions('announcement.create')
  create(@CurrentUser() user: JwtClaims, @Body() dto: CreateAnnouncementDto) {
    return this.announcementsService.create(user.organisation_id, user.sub, dto);
  }

  /** Org-wide listing (property-scoped and org-wide announcements together) for the staff communications register. */
  @Get()
  @RequirePermissions('announcement.read')
  listAll(@CurrentUser() user: JwtClaims, @Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.announcementsService.listForOrganisation(user.organisation_id, {
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
    });
  }

  @Get('property/:propertyId')
  @RequirePermissions('announcement.read')
  listForProperty(@CurrentUser() user: JwtClaims, @Param('propertyId') propertyId: string) {
    return this.announcementsService.listForProperty(user.organisation_id, propertyId);
  }

  @Get(':id')
  @RequirePermissions('announcement.read')
  get(@CurrentUser() user: JwtClaims, @Param('id') id: string) {
    return this.announcementsService.get(user.organisation_id, id);
  }

  @Patch(':id/publish')
  @RequirePermissions('announcement.publish')
  publish(@CurrentUser() user: JwtClaims, @Param('id') id: string) {
    return this.announcementsService.publish(user.organisation_id, id);
  }
}
