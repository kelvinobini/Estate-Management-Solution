import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import { Kysely, sql } from 'kysely';
import { KYSELY_INSTANCE } from '../database/database.tokens';
import { Database } from '../database/kysely.types';

/**
 * Deliberately unauthenticated (no JwtAuthGuard) — Kubernetes probes don't
 * carry a bearer token, and there's nothing sensitive in either response.
 */
@Controller('health')
export class HealthController {
  constructor(@Inject(KYSELY_INSTANCE) private readonly db: Kysely<Database>) {}

  /** Liveness: is the process itself responsive? No dependency checks — a DB hiccup shouldn't get the pod killed and restarted. */
  @Get('live')
  live() {
    return { status: 'ok' };
  }

  /** Readiness: can this pod actually serve traffic? Checked against the one dependency nothing works without. */
  @Get('ready')
  async ready() {
    try {
      await sql`select 1`.execute(this.db);
      return { status: 'ok' };
    } catch (error) {
      throw new ServiceUnavailableException(`Database is not reachable: ${(error as Error).message}`);
    }
  }
}
