import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtClaims } from '../../../common/interfaces/authenticated-request.interface';
import { BlocksService } from '../services/blocks.service';
import { CreateBlockDto } from '../dto/create-block.dto';

/** No class-level prefix: routes nest under /properties/:propertyId/blocks plus a standalone /blocks/:id lookup. */
@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BlocksController {
  constructor(private readonly blocksService: BlocksService) {}

  @Post('properties/:propertyId/blocks')
  @RequirePermissions('block.create')
  create(@CurrentUser() user: JwtClaims, @Param('propertyId') propertyId: string, @Body() dto: CreateBlockDto) {
    return this.blocksService.create(user.organisation_id, propertyId, dto);
  }

  @Get('properties/:propertyId/blocks')
  @RequirePermissions('block.read')
  listForProperty(@CurrentUser() user: JwtClaims, @Param('propertyId') propertyId: string) {
    return this.blocksService.listForProperty(user.organisation_id, propertyId);
  }

  @Get('blocks/:id')
  @RequirePermissions('block.read')
  get(@CurrentUser() user: JwtClaims, @Param('id') id: string) {
    return this.blocksService.get(user.organisation_id, id);
  }
}
