import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { UsersModule } from '../users/users.module';
import { EmailModule } from '../../integrations/email/email.module';
import { InquiriesController } from './controllers/inquiries.controller';
import { InquiriesService } from './services/inquiries.service';
import { InquiriesRepository } from './repositories/inquiries.repository';
import { INQUIRIES_REDIS_CLIENT } from './inquiries.tokens';

@Module({
  imports: [UsersModule, EmailModule],
  controllers: [InquiriesController],
  providers: [
    {
      provide: INQUIRIES_REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => new Redis(config.get<string>('REDIS_URL', 'redis://localhost:6379')),
    },
    InquiriesService,
    InquiriesRepository,
  ],
  exports: [InquiriesService],
})
export class InquiriesModule {}
