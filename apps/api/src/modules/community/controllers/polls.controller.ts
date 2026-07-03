import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtClaims } from '../../../common/interfaces/authenticated-request.interface';
import { PollsService } from '../services/polls.service';
import { CreatePollDto } from '../dto/create-poll.dto';
import { CastVoteDto } from '../dto/cast-vote.dto';

@Controller('polls')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PollsController {
  constructor(private readonly pollsService: PollsService) {}

  @Post()
  @RequirePermissions('poll.create')
  create(@CurrentUser() user: JwtClaims, @Body() dto: CreatePollDto) {
    return this.pollsService.create(user.organisation_id, dto);
  }

  @Get('property/:propertyId')
  @RequirePermissions('poll.read')
  listForProperty(@CurrentUser() user: JwtClaims, @Param('propertyId') propertyId: string) {
    return this.pollsService.listForProperty(user.organisation_id, propertyId);
  }

  @Get(':id')
  @RequirePermissions('poll.read')
  get(@CurrentUser() user: JwtClaims, @Param('id') id: string) {
    return this.pollsService.get(user.organisation_id, id);
  }

  @Get(':id/options')
  @RequirePermissions('poll.read')
  listOptions(@CurrentUser() user: JwtClaims, @Param('id') id: string) {
    return this.pollsService.listOptions(user.organisation_id, id);
  }

  @Post(':id/votes')
  @RequirePermissions('poll.vote')
  vote(@CurrentUser() user: JwtClaims, @Param('id') id: string, @Body() dto: CastVoteDto) {
    return this.pollsService.vote(user.organisation_id, id, user.sub, dto);
  }

  @Get(':id/results')
  @RequirePermissions('poll.read')
  tally(@CurrentUser() user: JwtClaims, @Param('id') id: string) {
    return this.pollsService.tally(user.organisation_id, id);
  }
}
