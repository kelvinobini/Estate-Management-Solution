import { Module } from '@nestjs/common';
import { LeaseModule } from '../lease/lease.module';
import { AnnouncementsController } from './controllers/announcements.controller';
import { AmenitiesController } from './controllers/amenities.controller';
import { BookingsController } from './controllers/bookings.controller';
import { ComplaintsController } from './controllers/complaints.controller';
import { DisputesController } from './controllers/disputes.controller';
import { PollsController } from './controllers/polls.controller';
import { AnnouncementsService } from './services/announcements.service';
import { AmenitiesService } from './services/amenities.service';
import { BookingsService } from './services/bookings.service';
import { ComplaintsService } from './services/complaints.service';
import { DisputesService } from './services/disputes.service';
import { PollsService } from './services/polls.service';
import { AnnouncementsRepository } from './repositories/announcements.repository';
import { AmenitiesRepository } from './repositories/amenities.repository';
import { BookingsRepository } from './repositories/bookings.repository';
import { ComplaintsRepository } from './repositories/complaints.repository';
import { DisputesRepository } from './repositories/disputes.repository';
import { PollsRepository } from './repositories/polls.repository';
import { PollOptionsRepository } from './repositories/poll-options.repository';
import { PollVotesRepository } from './repositories/poll-votes.repository';

@Module({
  imports: [LeaseModule],
  controllers: [AnnouncementsController, AmenitiesController, BookingsController, ComplaintsController, DisputesController, PollsController],
  providers: [
    AnnouncementsService,
    AmenitiesService,
    BookingsService,
    ComplaintsService,
    DisputesService,
    PollsService,
    AnnouncementsRepository,
    AmenitiesRepository,
    BookingsRepository,
    ComplaintsRepository,
    DisputesRepository,
    PollsRepository,
    PollOptionsRepository,
    PollVotesRepository,
  ],
  exports: [ComplaintsService, DisputesService],
})
export class CommunityModule {}
