import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { TenantsService } from '../../src/modules/lease/services/tenants.service';

describe('TenantsService', () => {
  const organisationId = 'org-1';
  let db: any;
  let tenantsRepo: any;
  let usersRepo: any;
  let service: TenantsService;

  beforeEach(() => {
    db = { withTenant: jest.fn((_orgId: string, work: (trx: unknown) => unknown) => work({})) };
    tenantsRepo = {
      findById: jest.fn(),
      findByUserId: jest.fn(),
      update: jest.fn(async (_trx, _orgId, tenantId, changes) => ({ id: tenantId, ...changes })),
    };
    usersRepo = {
      findByEmail: jest.fn(async () => undefined),
      findRoleByName: jest.fn(async () => ({ id: 'role-tenant' })),
      create: jest.fn(async (_trx, user) => ({ id: 'user-1', ...user })),
      assignRole: jest.fn(async () => undefined),
    };
    service = new TenantsService(db, tenantsRepo, usersRepo);
  });

  describe('resolveOwnTenantId', () => {
    it("returns the tenant's id when the login is linked", async () => {
      tenantsRepo.findByUserId.mockResolvedValue({ id: 'tenant-1' });
      const result = await service.resolveOwnTenantId(organisationId, 'user-1');
      expect(result).toBe('tenant-1');
    });

    it('returns null when the login is not linked to any tenant', async () => {
      tenantsRepo.findByUserId.mockResolvedValue(undefined);
      const result = await service.resolveOwnTenantId(organisationId, 'user-1');
      expect(result).toBeNull();
    });
  });

  describe('grantPortalAccess', () => {
    const tenant = { id: 'tenant-1', full_name: 'Ada Lovelace', email: 'ada@example.com', phone: '0800', user_id: null };

    it('creates a Tenant-role user, links it back via tenants.user_id, and returns the temp password', async () => {
      tenantsRepo.findById.mockResolvedValue(tenant);

      const result = await service.grantPortalAccess(organisationId, 'tenant-1');

      expect(usersRepo.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ organisation_id: organisationId, email: 'ada@example.com', status: 'active' }),
      );
      expect(usersRepo.assignRole).toHaveBeenCalledWith(expect.anything(), 'user-1', 'role-tenant');
      expect(tenantsRepo.update).toHaveBeenCalledWith(expect.anything(), organisationId, 'tenant-1', { user_id: 'user-1' });
      expect(result.temporaryPassword).toEqual(expect.any(String));
      expect(result.user).not.toHaveProperty('password_hash');
    });

    it('rejects when the tenant does not exist', async () => {
      tenantsRepo.findById.mockResolvedValue(undefined);
      await expect(service.grantPortalAccess(organisationId, 'missing')).rejects.toThrow(NotFoundException);
    });

    it('rejects when the tenant already has portal access', async () => {
      tenantsRepo.findById.mockResolvedValue({ ...tenant, user_id: 'user-existing' });
      await expect(service.grantPortalAccess(organisationId, 'tenant-1')).rejects.toThrow(ConflictException);
    });

    it('rejects when the tenant has no email on file', async () => {
      tenantsRepo.findById.mockResolvedValue({ ...tenant, email: null });
      await expect(service.grantPortalAccess(organisationId, 'tenant-1')).rejects.toThrow(BadRequestException);
    });

    it('rejects when a user with that email already exists in the org', async () => {
      tenantsRepo.findById.mockResolvedValue(tenant);
      usersRepo.findByEmail.mockResolvedValue({ id: 'user-existing' });
      await expect(service.grantPortalAccess(organisationId, 'tenant-1')).rejects.toThrow(ConflictException);
    });

    it("rejects when no 'Tenant' role exists for the organisation", async () => {
      tenantsRepo.findById.mockResolvedValue(tenant);
      usersRepo.findRoleByName.mockResolvedValue(undefined);
      await expect(service.grantPortalAccess(organisationId, 'tenant-1')).rejects.toThrow(BadRequestException);
    });
  });
});
