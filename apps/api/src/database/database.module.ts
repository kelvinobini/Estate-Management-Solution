import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { Kysely, PostgresDialect } from 'kysely';
import { Database } from './kysely.types';
import { TenantDatabaseService } from './database.service';
import { KYSELY_INSTANCE } from './database.tokens';

export { KYSELY_INSTANCE };

@Global()
@Module({
  providers: [
    {
      provide: KYSELY_INSTANCE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new Kysely<Database>({
          dialect: new PostgresDialect({
            pool: new Pool({
              connectionString: config.get<string>('DATABASE_URL'),
              max: config.get<number>('DATABASE_POOL_MAX', 10),
            }),
          }),
        }),
    },
    TenantDatabaseService,
  ],
  exports: [KYSELY_INSTANCE, TenantDatabaseService],
})
export class DatabaseModule {}
