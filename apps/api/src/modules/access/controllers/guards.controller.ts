import { Body, Controller, ForbiddenException, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtClaims } from '../../../common/interfaces/authenticated-request.interface';
import { GuardsService } from '../services/guards.service';
import { GuardShiftsService } from '../services/guard-shifts.service';
import { AssignGuardDto } from '../dto/assign-guard.dto';
import { CreateGuardShiftDto } from '../dto/create-guard-shift.dto';
import { CreatePatrolLogDto } from '../dto/create-patrol-log.dto';

@Controller('guards')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class GuardsController {
  constructor(
    private readonly guardsService: GuardsService,
    private readonly shiftsService: GuardShiftsService,
  ) {}

  @Post()
  @RequirePermissions('guard.assign')
  assign(@CurrentUser() user: JwtClaims, @Body() dto: AssignGuardDto) {
    return this.guardsService.assign(user.organisation_id, dto);
  }

  @Get('property/:propertyId')
  @RequirePermissions('guard.read')
  listForProperty(@CurrentUser() user: JwtClaims, @Param('propertyId') propertyId: string) {
    return this.guardsService.listForProperty(user.organisation_id, propertyId);
  }

  /**
   * "Who am I as a guard" — deliberately guarded by JwtAuthGuard only, no
   * @RequirePermissions (same pattern as TenantsController.getOwn):
   * SecurityGuard logins don't carry guard.read, and the response is
   * inherently self-scoped, so there's no cross-guard risk in leaving it
   * open to any authenticated caller. The mobile gate app needs this to
   * learn its own guards.id before it can call the guard-scoped shift routes.
   *
   * Registered before ':id' — same segment count, so registration order
   * matters or ':id' would swallow 'me' as a param value.
   */
  @Get('me')
  getOwn(@CurrentUser() user: JwtClaims) {
    return this.guardsService.getOwn(user.organisation_id, user.sub);
  }

  @Get(':id')
  @RequirePermissions('guard.read')
  get(@CurrentUser() user: JwtClaims, @Param('id') id: string) {
    return this.guardsService.get(user.organisation_id, id);
  }

  @Post(':guardId/shifts')
  @RequirePermissions('guard_shift.create')
  createShift(@CurrentUser() user: JwtClaims, @Param('guardId') guardId: string, @Body() dto: CreateGuardShiftDto) {
    return this.shiftsService.create(user.organisation_id, guardId, dto);
  }

  /**
   * SecurityGuard callers carry guard_shift.read (to see their own schedule)
   * but not guard.read, so — unlike the tenant.id cases elsewhere — this one
   * is cleanly fixable: `guards.user_id` and the JWT `sub` are both
   * `users.id`, the same ID space, so ownership can be checked directly.
   */
  @Get(':guardId/shifts')
  @RequirePermissions('guard_shift.read')
  async listShifts(@CurrentUser() user: JwtClaims, @Param('guardId') guardId: string) {
    const guard = await this.guardsService.get(user.organisation_id, guardId);
    this.assertGuardOwnership(user, guard.user_id);
    return this.shiftsService.listForGuard(user.organisation_id, guardId);
  }

  @Post('shifts/:shiftId/patrol-logs')
  @RequirePermissions('patrol_log.create')
  async logPatrol(@CurrentUser() user: JwtClaims, @Param('shiftId') shiftId: string, @Body() dto: CreatePatrolLogDto) {
    await this.assertShiftOwnership(user, shiftId);
    return this.shiftsService.logPatrol(user.organisation_id, shiftId, dto);
  }

  @Get('shifts/:shiftId/patrol-logs')
  @RequirePermissions('patrol_log.read')
  async listPatrolLogs(@CurrentUser() user: JwtClaims, @Param('shiftId') shiftId: string) {
    await this.assertShiftOwnership(user, shiftId);
    return this.shiftsService.listPatrolLogs(user.organisation_id, shiftId);
  }

  private async assertShiftOwnership(user: JwtClaims, shiftId: string): Promise<void> {
    const shift = await this.shiftsService.getShift(user.organisation_id, shiftId);
    const guard = await this.guardsService.get(user.organisation_id, shift.guard_id);
    this.assertGuardOwnership(user, guard.user_id);
  }

  /** Staff roles carrying guard_shift.read/patrol_log.read see every guard's records; a SecurityGuard sees only their own. */
  private assertGuardOwnership(user: JwtClaims, guardUserId: string): void {
    if (user.role === 'SecurityGuard' && user.sub !== guardUserId) {
      throw new ForbiddenException('Guards may only view their own shifts and patrol logs');
    }
  }
}
