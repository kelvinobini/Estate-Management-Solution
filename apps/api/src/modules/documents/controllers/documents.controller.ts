import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { JwtClaims } from '../../../common/interfaces/authenticated-request.interface';
import { AuditLogInterceptor } from '../../compliance/interceptors/audit-log.interceptor';
import { AuditAction } from '../../compliance/decorators/audit-action.decorator';
import { DocumentsService } from '../services/documents.service';
import { ExpiryAlertsService } from '../services/expiry-alerts.service';
import { TenantsService } from '../../lease/services/tenants.service';
import { PropertiesService } from '../../property/services/properties.service';
import { CreateDocumentDto } from '../dto/create-document.dto';
import { CreateDocumentVersionDto } from '../dto/create-document-version.dto';
import { CreateExpiryAlertDto } from '../dto/create-expiry-alert.dto';

@Controller('documents')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly expiryAlertsService: ExpiryAlertsService,
    private readonly tenantsService: TenantsService,
    private readonly propertiesService: PropertiesService,
  ) {}

  @Post()
  @RequirePermissions('document.create')
  create(@CurrentUser() user: JwtClaims, @Body() dto: CreateDocumentDto) {
    return this.documentsService.create(user.organisation_id, user.sub, dto);
  }

  /** Property-wide document listing is staff-only — it isn't scoped to a single tenant. Landlords are further scoped to properties they own. */
  @Get('property/:propertyId')
  @RequirePermissions('document.read')
  async listForProperty(@CurrentUser() user: JwtClaims, @Param('propertyId') propertyId: string) {
    if (user.role === 'Tenant') {
      throw new ForbiddenException('Tenants may only view their own documents');
    }
    if (user.role === 'Landlord') {
      const owns = await this.propertiesService.isOwner(user.organisation_id, propertyId, user.sub);
      if (!owns) {
        throw new ForbiddenException('Landlords may only view documents for properties they own');
      }
    }
    const documents = await this.documentsService.listForProperty(user.organisation_id, propertyId);
    return documents.filter((doc) => this.canView(user, doc.access_level));
  }

  @Get('tenant/:tenantId')
  @RequirePermissions('document.read')
  async listForTenant(@CurrentUser() user: JwtClaims, @Param('tenantId') tenantId: string) {
    if (user.role === 'Landlord') {
      // Tenant-linked documents (e.g. ID documents) don't carry a property_id, so ownership
      // can't be resolved from a bare tenant ID. Landlords should use GET /documents/property/:id.
      throw new ForbiddenException('Landlords should use GET /documents/property/:propertyId to view documents');
    }
    await this.assertTenantCanView(user, tenantId);
    const documents = await this.documentsService.listForTenant(user.organisation_id, tenantId);
    return documents.filter((doc) => this.canView(user, doc.access_level));
  }

  /** Lease documents may belong to co-tenants too, not just the primary tenant — staff-only until that's resolvable from a JWT. */
  @Get('lease/:leaseId')
  @RequirePermissions('document.read')
  async listForLease(@CurrentUser() user: JwtClaims, @Param('leaseId') leaseId: string) {
    if (user.role === 'Tenant') {
      throw new ForbiddenException('Tenants may only view their own documents');
    }
    if (user.role === 'Landlord') {
      // Same reasoning as the tenant/:tenantId route above — no property_id to check ownership against.
      throw new ForbiddenException('Landlords should use GET /documents/property/:propertyId to view documents');
    }
    const documents = await this.documentsService.listForLease(user.organisation_id, leaseId);
    return documents.filter((doc) => this.canView(user, doc.access_level));
  }

  @Get(':id')
  @RequirePermissions('document.read')
  async get(@CurrentUser() user: JwtClaims, @Param('id') id: string) {
    const document = await this.documentsService.get(user.organisation_id, id);
    this.assertCanView(user, document.access_level);
    if (document.tenant_id) {
      await this.assertTenantCanView(user, document.tenant_id);
    } else if (user.role === 'Tenant') {
      throw new ForbiddenException('Tenants may only view their own documents');
    }
    if (user.role === 'Landlord') {
      const owns = document.property_id
        ? await this.propertiesService.isOwner(user.organisation_id, document.property_id, user.sub)
        : false;
      if (!owns) {
        throw new ForbiddenException('Landlords may only view documents for properties they own');
      }
    }
    return document;
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions('document.delete')
  @UseInterceptors(AuditLogInterceptor)
  @AuditAction({ action: 'document.deleted', entityType: 'document' })
  async remove(@CurrentUser() user: JwtClaims, @Param('id') id: string) {
    await this.documentsService.remove(user.organisation_id, id);
  }

  @Post(':id/versions')
  @RequirePermissions('document.version.create')
  uploadVersion(@CurrentUser() user: JwtClaims, @Param('id') id: string, @Body() dto: CreateDocumentVersionDto) {
    return this.documentsService.uploadNewVersion(user.organisation_id, id, user.sub, dto);
  }

  @Get(':id/versions')
  @RequirePermissions('document.version.read')
  listVersions(@CurrentUser() user: JwtClaims, @Param('id') id: string) {
    return this.documentsService.listVersions(user.organisation_id, id);
  }

  @Post(':id/expiry-alerts')
  @RequirePermissions('document.create')
  createExpiryAlert(@CurrentUser() user: JwtClaims, @Param('id') id: string, @Body() dto: CreateExpiryAlertDto) {
    return this.expiryAlertsService.create(user.organisation_id, id, dto);
  }

  @Get(':id/expiry-alerts')
  @RequirePermissions('expiry_alert.read')
  listExpiryAlerts(@CurrentUser() user: JwtClaims, @Param('id') id: string) {
    return this.expiryAlertsService.listForDocument(user.organisation_id, id);
  }

  /** Confidential documents require the extra document.read_confidential permission beyond the base document.read. */
  private canView(user: JwtClaims, accessLevel: string): boolean {
    return accessLevel !== 'confidential' || user.permissions.includes('document.read_confidential');
  }

  private assertCanView(user: JwtClaims, accessLevel: string): void {
    if (!this.canView(user, accessLevel)) {
      throw new ForbiddenException('This document is confidential');
    }
  }

  /** Tenants may only ever view their own documents; staff roles carrying document.read see everyone's. */
  private async assertTenantCanView(user: JwtClaims, tenantId: string): Promise<void> {
    if (user.role !== 'Tenant') return;
    const ownTenantId = await this.tenantsService.resolveOwnTenantId(user.organisation_id, user.sub);
    if (!ownTenantId || ownTenantId !== tenantId) {
      throw new ForbiddenException('Tenants may only view their own documents');
    }
  }
}
