import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtClaims } from '../../../common/interfaces/authenticated-request.interface';
import { FloorsService } from '../services/floors.service';
import { CreateFloorDto } from '../dto/create-floor.dto';

@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class FloorsController {
  constructor(private readonly floorsService: FloorsService) {}

  @Post('blocks/:blockId/floors')
  @RequirePermissions('floor.create')
  create(@CurrentUser() user: JwtClaims, @Param('blockId') blockId: string, @Body() dto: CreateFloorDto) {
    return this.floorsService.create(user.organisation_id, blockId, dto);
  }

  @Get('blocks/:blockId/floors')
  @RequirePermissions('floor.read')
  listForBlock(@CurrentUser() user: JwtClaims, @Param('blockId') blockId: string) {
    return this.floorsService.listForBlock(user.organisation_id, blockId);
  }

  @Get('floors/:id')
  @RequirePermissions('floor.read')
  get(@CurrentUser() user: JwtClaims, @Param('id') id: string) {
    return this.floorsService.get(user.organisation_id, id);
  }
}
