import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { TokenService } from './services/token.service';
import { MfaService } from './services/mfa.service';
import { AuthRepository } from './repositories/auth.repository';
import { REDIS_CLIENT } from './auth.tokens';

export { REDIS_CLIENT };

@Module({
  controllers: [AuthController],
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => new Redis(config.get<string>('REDIS_URL', 'redis://localhost:6379')),
    },
    AuthService,
    TokenService,
    MfaService,
    AuthRepository,
  ],
  exports: [AuthService],
})
export class AuthModule {}
