import { BadRequestException } from '@nestjs/common';
import { LeaseUnitStatusListener } from '../../src/modules/property/services/lease-unit-status.listener';
import { LeaseEndedEvent, LeaseSignedEvent } from '../../src/common/events/lease.events';

describe('LeaseUnitStatusListener', () => {
  let unitsService: any;
  let listener: LeaseUnitStatusListener;

  beforeEach(() => {
    unitsService = { updateStatus: jest.fn() };
    listener = new LeaseUnitStatusListener(unitsService);
  });

  it('occupies the unit when a lease is signed', async () => {
    await listener.handleLeaseSigned(new LeaseSignedEvent('org-1', 'lease-1', 'unit-1', 'tenant-1', '100000', 'monthly', '2026-08-01'));
    expect(unitsService.updateStatus).toHaveBeenCalledWith('org-1', 'unit-1', 'occupied');
  });

  it('vacates the unit when a lease ends (terminated or expired)', async () => {
    await listener.handleLeaseEnded(new LeaseEndedEvent('org-1', 'lease-1', 'unit-1', 'terminated'));
    expect(unitsService.updateStatus).toHaveBeenCalledWith('org-1', 'unit-1', 'vacant');
  });

  it('does not propagate a status-transition rejection — logs and continues instead', async () => {
    unitsService.updateStatus.mockRejectedValue(new BadRequestException("Cannot transition unit from 'under_maintenance' to 'occupied'"));

    await expect(
      listener.handleLeaseSigned(new LeaseSignedEvent('org-1', 'lease-1', 'unit-1', 'tenant-1', '100000', 'monthly', '2026-08-01')),
    ).resolves.toBeUndefined();
  });
});
