import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtClaims } from '../../../common/interfaces/authenticated-request.interface';
import { InventoryItemsService } from '../services/inventory-items.service';
import { CreateInventoryItemDto } from '../dto/create-inventory-item.dto';
import { RestockInventoryDto } from '../dto/restock-inventory.dto';

@Controller('inventory-items')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InventoryItemsController {
  constructor(private readonly inventoryItemsService: InventoryItemsService) {}

  @Post()
  @RequirePermissions('inventory.create')
  create(@CurrentUser() user: JwtClaims, @Body() dto: CreateInventoryItemDto) {
    return this.inventoryItemsService.create(user.organisation_id, dto);
  }

  @Get('low-stock')
  @RequirePermissions('inventory.read')
  listBelowReorderLevel(@CurrentUser() user: JwtClaims) {
    return this.inventoryItemsService.listBelowReorderLevel(user.organisation_id);
  }

  @Get()
  @RequirePermissions('inventory.read')
  list(@CurrentUser() user: JwtClaims) {
    return this.inventoryItemsService.list(user.organisation_id);
  }

  @Get(':id')
  @RequirePermissions('inventory.read')
  get(@CurrentUser() user: JwtClaims, @Param('id') id: string) {
    return this.inventoryItemsService.get(user.organisation_id, id);
  }

  @Patch(':id/restock')
  @RequirePermissions('inventory.restock')
  restock(@CurrentUser() user: JwtClaims, @Param('id') id: string, @Body() dto: RestockInventoryDto) {
    return this.inventoryItemsService.restock(user.organisation_id, id, dto);
  }
}
