import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { DatabaseModule } from './database/database.module';
import { PaystackModule } from './integrations/paystack/paystack.module';
import { FinancialModule } from './modules/financial/financial.module';
import { AuthModule } from './modules/auth/auth.module';
import { PropertyModule } from './modules/property/property.module';
import { LeaseModule } from './modules/lease/lease.module';
import { MaintenanceModule } from './modules/maintenance/maintenance.module';
import { AccessModule } from './modules/access/access.module';
import { UtilitiesModule } from './modules/utilities/utilities.module';
import { CommunityModule } from './modules/community/community.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { ReportingModule } from './modules/reporting/reporting.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { UsersModule } from './modules/users/users.module';
import { InquiriesModule } from './modules/inquiries/inquiries.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    BullModule.forRoot({
      connection: { url: process.env.REDIS_URL ?? 'redis://localhost:6379' },
    }),
    DatabaseModule,
    HealthModule,
    ComplianceModule,
    AuthModule,
    PaystackModule,
    PropertyModule,
    LeaseModule,
    MaintenanceModule,
    AccessModule,
    FinancialModule,
    UtilitiesModule,
    CommunityModule,
    DocumentsModule,
    ReportingModule,
    UsersModule,
    InquiriesModule,
  ],
})
export class AppModule {}
