/**
 * Seeds the permission catalog, default RBAC roles, and a demo organisation +
 * admin user so the Auth and Financial modules are exercisable end-to-end
 * without a full onboarding flow (which doesn't exist yet — see
 * docs/01-architecture.md deliverable backlog).
 *
 * Run with: npm run db:seed
 */
import 'dotenv/config';
import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';
import { Database } from './kysely.types';

/** Every permission code referenced by a @RequirePermissions(...) decorator in the codebase today. */
const PERMISSIONS: Array<{ code: string; module: string; description: string }> = [
  { code: 'invoice.create', module: 'financial', description: 'Create invoices' },
  { code: 'invoice.issue', module: 'financial', description: 'Issue draft invoices' },
  { code: 'invoice.void', module: 'financial', description: 'Void invoices' },
  { code: 'invoice.read', module: 'financial', description: 'Read invoices' },
  { code: 'payment.create', module: 'financial', description: 'Initiate payments' },
  { code: 'payment.record_manual', module: 'financial', description: 'Record offline (manual) payments' },
  { code: 'payment_plan.create', module: 'financial', description: 'Create installment payment plans' },
  { code: 'payment_plan.read', module: 'financial', description: 'Read installment payment plans' },
  { code: 'arrears.read', module: 'financial', description: 'Read arrears / recovery status' },
  { code: 'property.create', module: 'property', description: 'Create properties' },
  { code: 'property.read', module: 'property', description: 'Read properties' },
  { code: 'property.update', module: 'property', description: 'Update properties' },
  { code: 'property.delete', module: 'property', description: 'Soft-delete properties' },
  { code: 'property.valuation.create', module: 'property', description: 'Record property valuations' },
  { code: 'property.valuation.read', module: 'property', description: 'Read property valuation history' },
  { code: 'property.owner.assign', module: 'property', description: 'Link a landlord portal login to a property' },
  { code: 'block.create', module: 'property', description: 'Create blocks within a property' },
  { code: 'block.read', module: 'property', description: 'Read blocks' },
  { code: 'floor.create', module: 'property', description: 'Create floors within a block' },
  { code: 'floor.read', module: 'property', description: 'Read floors' },
  { code: 'unit.create', module: 'property', description: 'Create units within a floor' },
  { code: 'unit.read', module: 'property', description: 'Read units' },
  { code: 'unit.update', module: 'property', description: 'Update unit details' },
  { code: 'unit.status.update', module: 'property', description: 'Change unit occupancy status' },
  { code: 'unit.delete', module: 'property', description: 'Soft-delete units' },
  { code: 'unit.media.create', module: 'property', description: 'Upload unit media' },
  { code: 'unit.media.read', module: 'property', description: 'Read unit media' },
  { code: 'unit.media.delete', module: 'property', description: 'Delete unit media' },
  { code: 'tenant.create', module: 'lease', description: 'Onboard tenants' },
  { code: 'tenant.read', module: 'lease', description: 'Read tenant records' },
  { code: 'tenant.kyc.verify', module: 'lease', description: 'Record a tenant KYC decision' },
  { code: 'tenant.portal_access.grant', module: 'lease', description: "Grant a tenant a self-service portal login" },
  { code: 'lease.create', module: 'lease', description: 'Create and submit leases' },
  { code: 'lease.read', module: 'lease', description: 'Read leases' },
  { code: 'lease.activate', module: 'lease', description: 'Activate a signed lease' },
  { code: 'lease.renew', module: 'lease', description: 'Renew a lease' },
  { code: 'lease.terminate', module: 'lease', description: 'Terminate a lease' },
  { code: 'lease.co_tenant.manage', module: 'lease', description: 'Add co-tenants to a lease' },
  { code: 'lease.clause.manage', module: 'lease', description: 'Add clauses to a lease' },
  { code: 'vendor.create', module: 'maintenance', description: 'Onboard vendors' },
  { code: 'vendor.read', module: 'maintenance', description: 'Read vendor records' },
  { code: 'vendor.update', module: 'maintenance', description: 'Update vendor status/performance score' },
  { code: 'asset.create', module: 'maintenance', description: 'Register assets' },
  { code: 'asset.read', module: 'maintenance', description: 'Read assets' },
  { code: 'asset.update', module: 'maintenance', description: 'Update asset status' },
  { code: 'maintenance_schedule.create', module: 'maintenance', description: 'Create preventive maintenance schedules' },
  { code: 'maintenance_schedule.read', module: 'maintenance', description: 'Read preventive maintenance schedules' },
  { code: 'work_order.create', module: 'maintenance', description: 'Raise work orders' },
  { code: 'work_order.read', module: 'maintenance', description: 'Read work orders' },
  { code: 'work_order.assign', module: 'maintenance', description: 'Assign a work order to a vendor' },
  { code: 'work_order.update', module: 'maintenance', description: 'Change work order status' },
  { code: 'work_order.parts.manage', module: 'maintenance', description: 'Record parts consumed on a work order' },
  { code: 'inventory.create', module: 'maintenance', description: 'Create inventory items' },
  { code: 'inventory.read', module: 'maintenance', description: 'Read inventory items' },
  { code: 'inventory.restock', module: 'maintenance', description: 'Restock inventory items' },
  { code: 'vehicle.create', module: 'access', description: 'Register vehicles' },
  { code: 'vehicle.read', module: 'access', description: 'Read vehicle records' },
  { code: 'visitor.create', module: 'access', description: 'Pre-register visitors' },
  { code: 'visitor.read', module: 'access', description: 'Read visitor records' },
  { code: 'visitor.blacklist', module: 'access', description: 'Blacklist/unblacklist a visitor' },
  { code: 'gate_pass.issue', module: 'access', description: 'Issue a gate pass' },
  { code: 'gate_pass.read', module: 'access', description: 'Read gate passes' },
  { code: 'gate_pass.check_in', module: 'access', description: 'Check a visitor in or out at the gate' },
  { code: 'gate_pass.revoke', module: 'access', description: 'Revoke an unused gate pass' },
  { code: 'guard.assign', module: 'access', description: 'Assign a user as a guard' },
  { code: 'guard.read', module: 'access', description: 'Read guard records' },
  { code: 'guard_shift.create', module: 'access', description: 'Schedule guard shifts' },
  { code: 'guard_shift.read', module: 'access', description: 'Read guard shifts' },
  { code: 'patrol_log.create', module: 'access', description: 'Log a patrol checkpoint' },
  { code: 'patrol_log.read', module: 'access', description: 'Read patrol logs' },
  { code: 'incident.create', module: 'access', description: 'Report a security incident' },
  { code: 'incident.read', module: 'access', description: 'Read security incidents' },
  { code: 'incident.update', module: 'access', description: 'Update incident status' },
  { code: 'meter.create', module: 'utilities', description: 'Register meters' },
  { code: 'meter.read', module: 'utilities', description: 'Read meter records' },
  { code: 'meter_reading.create', module: 'utilities', description: 'Record a meter reading' },
  { code: 'meter_reading.read', module: 'utilities', description: 'Read meter readings' },
  { code: 'utility_invoice.generate', module: 'utilities', description: 'Generate a utility bill from meter readings' },
  { code: 'utility_invoice.read', module: 'utilities', description: 'Read utility invoices' },
  { code: 'announcement.create', module: 'community', description: 'Draft announcements' },
  { code: 'announcement.read', module: 'community', description: 'Read announcements' },
  { code: 'announcement.publish', module: 'community', description: 'Publish an announcement' },
  { code: 'amenity.create', module: 'community', description: 'Create bookable amenities' },
  { code: 'amenity.read', module: 'community', description: 'Read amenities' },
  { code: 'booking.create', module: 'community', description: 'Book an amenity' },
  { code: 'booking.read', module: 'community', description: 'Read amenity bookings' },
  { code: 'booking.cancel', module: 'community', description: 'Cancel an amenity booking' },
  { code: 'complaint.create', module: 'community', description: 'File a complaint' },
  { code: 'complaint.read', module: 'community', description: 'Read complaints' },
  { code: 'complaint.update', module: 'community', description: 'Update complaint status' },
  { code: 'dispute.create', module: 'community', description: 'Raise a dispute' },
  { code: 'dispute.read', module: 'community', description: 'Read disputes' },
  { code: 'dispute.update', module: 'community', description: 'Update dispute status' },
  { code: 'poll.create', module: 'community', description: 'Create a community poll' },
  { code: 'poll.read', module: 'community', description: 'Read polls and results' },
  { code: 'poll.vote', module: 'community', description: 'Vote in a community poll' },
  { code: 'document.create', module: 'documents', description: 'Upload documents' },
  { code: 'document.read', module: 'documents', description: 'Read non-confidential documents' },
  { code: 'document.read_confidential', module: 'documents', description: 'Read confidential documents' },
  { code: 'document.delete', module: 'documents', description: 'Soft-delete documents' },
  { code: 'document.version.create', module: 'documents', description: 'Upload a new document version' },
  { code: 'document.version.read', module: 'documents', description: 'Read document version history' },
  { code: 'expiry_alert.read', module: 'documents', description: 'Read document expiry alerts' },
  { code: 'report.read', module: 'reporting', description: 'Read portfolio/property KPI reports' },
  { code: 'audit_log.read', module: 'compliance', description: 'Read the audit trail' },
  { code: 'compliance.read', module: 'compliance', description: 'Read compliance certificates and jurisdiction checklists' },
  { code: 'data_subject.erase', module: 'compliance', description: 'Process a right-to-erasure (NDPR/GDPR) request' },
  { code: 'user.create', module: 'users', description: 'Invite staff user accounts' },
  { code: 'user.read', module: 'users', description: 'Read staff user accounts' },
  { code: 'user.update', module: 'users', description: 'Suspend/reactivate staff user accounts' },
  { code: 'role.read', module: 'users', description: 'Read the roles available in the organisation' },
  { code: 'role.manage', module: 'users', description: 'Create custom roles and edit their permission grants' },
  { code: 'inquiry.read', module: 'inquiries', description: 'Read landing-page access requests' },
  { code: 'inquiry.update', module: 'inquiries', description: 'Update the status of a landing-page access request' },
];

const ALL_PERMISSION_CODES = PERMISSIONS.map((p) => p.code);

const PROPERTY_MANAGER_CODES = [
  'property.read',
  'property.update',
  'property.valuation.create',
  'property.valuation.read',
  'property.owner.assign',
  'block.create',
  'block.read',
  'floor.create',
  'floor.read',
  'unit.create',
  'unit.read',
  'unit.update',
  'unit.status.update',
  'unit.delete',
  'unit.media.create',
  'unit.media.read',
  'unit.media.delete',
];

const OWNER_READ_CODES = ['property.read', 'property.valuation.read', 'block.read', 'floor.read', 'unit.read', 'unit.media.read'];

const LEASE_MANAGEMENT_CODES = [
  'tenant.create',
  'tenant.read',
  'tenant.kyc.verify',
  'tenant.portal_access.grant',
  'lease.create',
  'lease.read',
  'lease.activate',
  'lease.renew',
  'lease.terminate',
  'lease.co_tenant.manage',
  'lease.clause.manage',
];

const MAINTENANCE_MANAGEMENT_CODES = [
  'vendor.create',
  'vendor.read',
  'vendor.update',
  'asset.create',
  'asset.read',
  'asset.update',
  'maintenance_schedule.create',
  'maintenance_schedule.read',
  'work_order.create',
  'work_order.read',
  'work_order.assign',
  'work_order.update',
  'work_order.parts.manage',
  'inventory.create',
  'inventory.read',
  'inventory.restock',
];

const MAINTENANCE_STAFF_CODES = ['work_order.read', 'work_order.update', 'work_order.parts.manage', 'asset.read', 'inventory.read', 'inventory.restock'];

const ACCESS_MANAGEMENT_CODES = [
  'vehicle.create',
  'vehicle.read',
  'visitor.create',
  'visitor.read',
  'visitor.blacklist',
  'gate_pass.issue',
  'gate_pass.read',
  'gate_pass.check_in',
  'gate_pass.revoke',
  'guard.assign',
  'guard.read',
  'guard_shift.create',
  'guard_shift.read',
  'patrol_log.create',
  'patrol_log.read',
  'incident.create',
  'incident.read',
  'incident.update',
];

const SECURITY_GUARD_CODES = [
  'visitor.read',
  'gate_pass.read',
  'gate_pass.check_in',
  'guard_shift.read',
  'patrol_log.create',
  'patrol_log.read',
  'incident.create',
  'incident.read',
];

const COMMUNITY_MANAGEMENT_CODES = [
  'announcement.create',
  'announcement.read',
  'announcement.publish',
  'amenity.create',
  'amenity.read',
  'booking.read',
  'booking.cancel',
  'complaint.read',
  'complaint.update',
  'dispute.create',
  'dispute.read',
  'dispute.update',
  'poll.create',
  'poll.read',
];

const DOCUMENT_MANAGEMENT_CODES = [
  'document.create',
  'document.read',
  'document.read_confidential',
  'document.delete',
  'document.version.create',
  'document.version.read',
  'expiry_alert.read',
];

/** name -> permission codes granted, for roles scoped to the demo organisation. */
const ORG_ROLE_PERMISSIONS: Record<string, string[]> = {
  OrgAdmin: ALL_PERMISSION_CODES,
  FinanceOfficer: [
    'invoice.create',
    'invoice.issue',
    'invoice.void',
    'invoice.read',
    'payment.create',
    'payment.record_manual',
    'payment_plan.create',
    'payment_plan.read',
    'arrears.read',
    'property.read',
    'unit.read',
    'property.valuation.read',
    'tenant.read',
    'lease.read',
    'work_order.read',
    'asset.read',
    'vendor.read',
    'inventory.read',
    'meter.read',
    'utility_invoice.read',
    'dispute.read',
    'document.read',
    'report.read',
    'audit_log.read',
  ],
  PropertyManager: [
    ...PROPERTY_MANAGER_CODES,
    ...LEASE_MANAGEMENT_CODES,
    ...MAINTENANCE_MANAGEMENT_CODES,
    ...ACCESS_MANAGEMENT_CODES,
    ...COMMUNITY_MANAGEMENT_CODES,
    ...DOCUMENT_MANAGEMENT_CODES,
    'invoice.read',
    'arrears.read',
    'meter.create',
    'meter.read',
    'meter_reading.create',
    'meter_reading.read',
    'utility_invoice.generate',
    'utility_invoice.read',
    'report.read',
    'audit_log.read',
    'compliance.read',
    'user.read',
    'role.read',
    'inquiry.read',
    'inquiry.update',
  ],
  Landlord: [
    ...OWNER_READ_CODES,
    'invoice.read',
    'arrears.read',
    'tenant.read',
    'lease.read',
    'asset.read',
    'work_order.read',
    'visitor.read',
    'incident.read',
    'meter.read',
    'utility_invoice.read',
    'announcement.read',
    'complaint.read',
    'dispute.read',
    'document.read',
    'report.read',
    'compliance.read',
  ],
  Tenant: [
    'invoice.read',
    'payment.create',
    'payment_plan.read',
    'unit.read',
    'lease.read',
    'work_order.create',
    'work_order.read',
    'vehicle.create',
    'vehicle.read',
    'visitor.create',
    'visitor.read',
    'gate_pass.issue',
    'gate_pass.read',
    'announcement.read',
    'amenity.read',
    'booking.create',
    'booking.read',
    'booking.cancel',
    'complaint.create',
    'complaint.read',
    'dispute.read',
    'poll.read',
    'poll.vote',
    'document.read',
  ],
  MaintenanceStaff: ['unit.read', ...MAINTENANCE_STAFF_CODES, 'meter.read', 'meter_reading.create'],
  SecurityGuard: ['tenant.read', ...SECURITY_GUARD_CODES],
  Vendor: ['work_order.read'],
};

const DEMO_ORG_SLUG = 'demo';
const DEMO_ADMIN_EMAIL = 'admin@demo.estatecore.app';
const DEMO_ADMIN_PASSWORD = 'ChangeMe123!';

async function main(): Promise<void> {
  const db = new Kysely<Database>({
    dialect: new PostgresDialect({ pool: new Pool({ connectionString: process.env.DATABASE_URL }) }),
  });

  try {
    const permissionIdByCode = await seedPermissions(db);
    const superAdminRoleId = await seedGlobalSuperAdminRole(db, permissionIdByCode);
    const demoOrgId = await seedDemoOrganisation(db);
    const roleIdByName = await seedOrgRoles(db, demoOrgId, permissionIdByCode);
    await seedDemoAdminUser(db, demoOrgId, roleIdByName['OrgAdmin']);

    console.log('Seed complete.');
    console.log(`  SuperAdmin role id: ${superAdminRoleId}`);
    console.log(`  Demo organisation slug: ${DEMO_ORG_SLUG}`);
    console.log(`  Demo admin login: ${DEMO_ADMIN_EMAIL} / ${DEMO_ADMIN_PASSWORD}`);
    console.log(
      '  Note: OrgAdmin requires MFA — first login will return `mfa_setup_required`; ' +
        'call POST /auth/mfa/enroll then /auth/mfa/confirm with that token before a full session is issued.',
    );
  } finally {
    await db.destroy();
  }
}

async function seedPermissions(db: Kysely<Database>): Promise<Record<string, string>> {
  for (const permission of PERMISSIONS) {
    await db
      .insertInto('permissions')
      .values(permission)
      .onConflict((oc) => oc.column('code').doUpdateSet({ description: (eb) => eb.ref('excluded.description') }))
      .execute();
  }

  const rows = await db.selectFrom('permissions').select(['id', 'code']).execute();
  return Object.fromEntries(rows.map((r) => [r.code, r.id]));
}

/** roles.organisation_id is nullable for global roles, and NULLs never collide under a UNIQUE constraint, so this upserts by hand. */
async function seedGlobalSuperAdminRole(
  db: Kysely<Database>,
  permissionIdByCode: Record<string, string>,
): Promise<string> {
  const existing = await db
    .selectFrom('roles')
    .select('id')
    .where('organisation_id', 'is', null)
    .where('name', '=', 'SuperAdmin')
    .executeTakeFirst();

  const roleId =
    existing?.id ??
    (
      await db
        .insertInto('roles')
        .values({ organisation_id: null, name: 'SuperAdmin', is_system_role: true })
        .returning('id')
        .executeTakeFirstOrThrow()
    ).id;

  for (const code of Object.keys(permissionIdByCode)) {
    await db
      .insertInto('role_permissions')
      .values({ role_id: roleId, permission_id: permissionIdByCode[code] })
      .onConflict((oc) => oc.columns(['role_id', 'permission_id']).doNothing())
      .execute();
  }

  return roleId;
}

async function seedDemoOrganisation(db: Kysely<Database>): Promise<string> {
  const org = await db
    .insertInto('organisations')
    .values({
      name: 'Rose Garden Estate',
      slug: DEMO_ORG_SLUG,
      country_code: 'NG',
      default_currency: 'NGN',
      timezone: 'Africa/Lagos',
      plan: 'starter',
      is_active: true,
    })
    .onConflict((oc) => oc.column('slug').doUpdateSet({ name: (eb) => eb.ref('excluded.name') }))
    .returning('id')
    .executeTakeFirstOrThrow();

  return org.id;
}

async function seedOrgRoles(
  db: Kysely<Database>,
  organisationId: string,
  permissionIdByCode: Record<string, string>,
): Promise<Record<string, string>> {
  const roleIdByName: Record<string, string> = {};

  for (const [roleName, codes] of Object.entries(ORG_ROLE_PERMISSIONS)) {
    const role = await db
      .insertInto('roles')
      .values({ organisation_id: organisationId, name: roleName, is_system_role: false })
      .onConflict((oc) => oc.columns(['organisation_id', 'name']).doUpdateSet({ name: (eb) => eb.ref('excluded.name') }))
      .returning('id')
      .executeTakeFirstOrThrow();

    roleIdByName[roleName] = role.id;

    for (const code of codes) {
      await db
        .insertInto('role_permissions')
        .values({ role_id: role.id, permission_id: permissionIdByCode[code] })
        .onConflict((oc) => oc.columns(['role_id', 'permission_id']).doNothing())
        .execute();
    }
  }

  return roleIdByName;
}

async function seedDemoAdminUser(db: Kysely<Database>, organisationId: string, orgAdminRoleId: string): Promise<void> {
  const passwordHash = await bcrypt.hash(DEMO_ADMIN_PASSWORD, 12);

  const user = await db
    .insertInto('users')
    .values({
      organisation_id: organisationId,
      email: DEMO_ADMIN_EMAIL,
      full_name: 'Estate Administrator',
      password_hash: passwordHash,
      status: 'active',
    })
    .onConflict((oc) => oc.columns(['organisation_id', 'email']).doUpdateSet({ full_name: (eb) => eb.ref('excluded.full_name') }))
    .returning('id')
    .executeTakeFirstOrThrow();

  await db
    .insertInto('user_roles')
    .values({ user_id: user.id, role_id: orgAdminRoleId })
    .onConflict((oc) => oc.columns(['user_id', 'role_id']).doNothing())
    .execute();
}

main().catch((error) => {
  console.error('Seed failed:', error);
  process.exitCode = 1;
});
