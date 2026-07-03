import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { LeaseEndedEvent, LeaseEvent, LeaseSignedEvent } from '../../../common/events/lease.events';
import { UnitsService } from './units.service';

/**
 * Second half of the lease-event cross-module wiring (the first being
 * Financial's LeaseSignedInvoiceListener): occupies the unit when a lease is
 * signed, vacates it when the lease ends. Transition rejections are logged
 * rather than thrown — a unit already in an unexpected state (e.g. manually
 * set to under_maintenance) shouldn't block the lease lifecycle itself.
 */
@Injectable()
export class LeaseUnitStatusListener {
  private readonly logger = new Logger(LeaseUnitStatusListener.name);

  constructor(private readonly unitsService: UnitsService) {}

  @OnEvent(LeaseEvent.Signed)
  async handleLeaseSigned(event: LeaseSignedEvent): Promise<void> {
    await this.tryUpdateStatus(event.organisationId, event.unitId, 'occupied');
  }

  @OnEvent(LeaseEvent.Terminated)
  @OnEvent(LeaseEvent.Expired)
  async handleLeaseEnded(event: LeaseEndedEvent): Promise<void> {
    await this.tryUpdateStatus(event.organisationId, event.unitId, 'vacant');
  }

  private async tryUpdateStatus(organisationId: string, unitId: string, status: string): Promise<void> {
    try {
      await this.unitsService.updateStatus(organisationId, unitId, status);
    } catch (error) {
      this.logger.warn(`Could not set unit ${unitId} to '${status}': ${(error as Error).message}`);
    }
  }
}
