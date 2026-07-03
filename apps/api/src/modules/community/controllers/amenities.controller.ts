import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtClaims } from '../../../common/interfaces/authenticated-request.interface';
import { AmenitiesService } from '../services/amenities.service';
import { CreateAmenityDto } from '../dto/create-amenity.dto';

@Controller('amenities')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AmenitiesController {
  constructor(private readonly amenitiesService: AmenitiesService) {}

  @Post()
  @RequirePermissions('amenity.create')
  create(@CurrentUser() user: JwtClaims, @Body() dto: CreateAmenityDto) {
    return this.amenitiesService.create(user.organisation_id, dto);
  }

  @Get('property/:propertyId')
  @RequirePermissions('amenity.read')
  listForProperty(@CurrentUser() user: JwtClaims, @Param('propertyId') propertyId: string) {
    return this.amenitiesService.listForProperty(user.organisation_id, propertyId);
  }

  @Get(':id')
  @RequirePermissions('amenity.read')
  get(@CurrentUser() user: JwtClaims, @Param('id') id: string) {
    return this.amenitiesService.get(user.organisation_id, id);
  }
}
