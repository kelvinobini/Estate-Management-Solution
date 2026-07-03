import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PollsService } from '../../src/modules/community/services/polls.service';

describe('PollsService.vote', () => {
  const organisationId = 'org-1';
  let db: any;
  let pollsRepo: any;
  let pollOptionsRepo: any;
  let pollVotesRepo: any;
  let service: PollsService;

  beforeEach(() => {
    db = { withTenant: jest.fn((_orgId: string, work: (trx: unknown) => unknown) => work({})) };
    pollsRepo = { findById: jest.fn() };
    pollOptionsRepo = { findById: jest.fn() };
    pollVotesRepo = {
      findByPollAndTenant: jest.fn(),
      create: jest.fn(async (_trx, vote) => ({ id: 'vote-1', ...vote })),
    };

    service = new PollsService(db, pollsRepo, pollOptionsRepo, pollVotesRepo);
  });

  it('throws NotFoundException for a non-existent poll', async () => {
    pollsRepo.findById.mockResolvedValue(undefined);
    await expect(service.vote(organisationId, 'poll-1', 'tenant-1', { pollOptionId: 'opt-1' })).rejects.toThrow(NotFoundException);
  });

  it('rejects voting before the poll opens', async () => {
    pollsRepo.findById.mockResolvedValue({ id: 'poll-1', opens_at: new Date(Date.now() + 100000), closes_at: new Date(Date.now() + 200000) });
    await expect(service.vote(organisationId, 'poll-1', 'tenant-1', { pollOptionId: 'opt-1' })).rejects.toThrow(BadRequestException);
  });

  it('rejects voting after the poll closes', async () => {
    pollsRepo.findById.mockResolvedValue({ id: 'poll-1', opens_at: new Date(Date.now() - 200000), closes_at: new Date(Date.now() - 100000) });
    await expect(service.vote(organisationId, 'poll-1', 'tenant-1', { pollOptionId: 'opt-1' })).rejects.toThrow(BadRequestException);
  });

  it('rejects an option that does not belong to this poll', async () => {
    pollsRepo.findById.mockResolvedValue({ id: 'poll-1', opens_at: new Date(Date.now() - 1000), closes_at: new Date(Date.now() + 100000) });
    pollOptionsRepo.findById.mockResolvedValue({ id: 'opt-1', poll_id: 'some-other-poll' });

    await expect(service.vote(organisationId, 'poll-1', 'tenant-1', { pollOptionId: 'opt-1' })).rejects.toThrow(NotFoundException);
  });

  it('rejects a tenant voting twice in the same poll, even for a different option', async () => {
    pollsRepo.findById.mockResolvedValue({ id: 'poll-1', opens_at: new Date(Date.now() - 1000), closes_at: new Date(Date.now() + 100000) });
    pollOptionsRepo.findById.mockResolvedValue({ id: 'opt-2', poll_id: 'poll-1' });
    pollVotesRepo.findByPollAndTenant.mockResolvedValue({ id: 'existing-vote', poll_option_id: 'opt-1' });

    await expect(service.vote(organisationId, 'poll-1', 'tenant-1', { pollOptionId: 'opt-2' })).rejects.toThrow(BadRequestException);
    expect(pollVotesRepo.create).not.toHaveBeenCalled();
  });

  it('records a valid vote', async () => {
    pollsRepo.findById.mockResolvedValue({ id: 'poll-1', opens_at: new Date(Date.now() - 1000), closes_at: new Date(Date.now() + 100000) });
    pollOptionsRepo.findById.mockResolvedValue({ id: 'opt-1', poll_id: 'poll-1' });
    pollVotesRepo.findByPollAndTenant.mockResolvedValue(undefined);

    const vote = await service.vote(organisationId, 'poll-1', 'tenant-1', { pollOptionId: 'opt-1' });
    expect(vote.poll_option_id).toBe('opt-1');
  });
});
