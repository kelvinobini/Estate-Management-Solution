import { Module } from '@nestjs/common';
import { ComplianceModule } from '../compliance/compliance.module';
import { UsersController } from './controllers/users.controller';
import { RolesController } from './controllers/roles.controller';
import { PermissionsController } from './controllers/permissions.controller';
import { UsersService } from './services/users.service';
import { RolesService } from './services/roles.service';
import { UsersRepository } from './repositories/users.repository';
import { RolesRepository } from './repositories/roles.repository';

@Module({
  imports: [ComplianceModule],
  controllers: [UsersController, RolesController, PermissionsController],
  providers: [UsersService, RolesService, UsersRepository, RolesRepository],
  exports: [UsersRepository],
})
export class UsersModule {}
