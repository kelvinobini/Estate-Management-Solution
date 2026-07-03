import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TenantDatabaseService } from '../../../database/database.service';
import { PollsRepository } from '../repositories/polls.repository';
import { PollOptionsRepository } from '../repositories/poll-options.repository';
import { PollVotesRepository } from '../repositories/poll-votes.repository';
import { CreatePollDto } from '../dto/create-poll.dto';
import { CastVoteDto } from '../dto/cast-vote.dto';

@Injectable()
export class PollsService {
  constructor(
    private readonly db: TenantDatabaseService,
    private readonly pollsRepo: PollsRepository,
    private readonly pollOptionsRepo: PollOptionsRepository,
    private readonly pollVotesRepo: PollVotesRepository,
  ) {}

  async create(organisationId: string, dto: CreatePollDto) {
    const opensAt = new Date(dto.opensAt);
    const closesAt = new Date(dto.closesAt);
    if (closesAt <= opensAt) {
      throw new BadRequestException('closesAt must be after opensAt');
    }

    return this.db.withTenant(organisationId, async (trx) => {
      const poll = await this.pollsRepo.create(trx, {
        organisation_id: organisationId,
        property_id: dto.propertyId ?? null,
        question: dto.question,
        opens_at: opensAt,
        closes_at: closesAt,
      });

      const options = await this.pollOptionsRepo.createMany(
        trx,
        dto.options.map((option) => ({ organisation_id: organisationId, poll_id: poll.id, option_text: option.optionText })),
      );

      return { ...poll, options };
    });
  }

  async get(organisationId: string, pollId: string) {
    const poll = await this.db.withTenant(organisationId, (trx) => this.pollsRepo.findById(trx, organisationId, pollId));
    if (!poll) {
      throw new NotFoundException('Poll not found');
    }
    return poll;
  }

  async listForProperty(organisationId: string, propertyId: string) {
    return this.db.withTenant(organisationId, (trx) => this.pollsRepo.listForProperty(trx, organisationId, propertyId));
  }

  async listOptions(organisationId: string, pollId: string) {
    return this.db.withTenant(organisationId, (trx) => this.pollOptionsRepo.listForPoll(trx, organisationId, pollId));
  }

  async vote(organisationId: string, pollId: string, tenantId: string, dto: CastVoteDto) {
    return this.db.withTenant(organisationId, async (trx) => {
      const poll = await this.pollsRepo.findById(trx, organisationId, pollId);
      if (!poll) {
        throw new NotFoundException('Poll not found');
      }

      const now = new Date();
      if (now < new Date(poll.opens_at)) {
        throw new BadRequestException('This poll is not open yet');
      }
      if (now > new Date(poll.closes_at)) {
        throw new BadRequestException('This poll has closed');
      }

      const option = await this.pollOptionsRepo.findById(trx, organisationId, dto.pollOptionId);
      if (!option || option.poll_id !== pollId) {
        throw new NotFoundException('Poll option not found for this poll');
      }

      const existingVote = await this.pollVotesRepo.findByPollAndTenant(trx, organisationId, pollId, tenantId);
      if (existingVote) {
        throw new BadRequestException('You have already voted in this poll');
      }

      return this.pollVotesRepo.create(trx, { organisation_id: organisationId, poll_option_id: dto.pollOptionId, tenant_id: tenantId });
    });
  }

  async tally(organisationId: string, pollId: string) {
    await this.get(organisationId, pollId);
    return this.db.withTenant(organisationId, (trx) => this.pollVotesRepo.tallyForPoll(trx, organisationId, pollId));
  }
}
