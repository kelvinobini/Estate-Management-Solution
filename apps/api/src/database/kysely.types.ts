import { ColumnType, Generated } from 'kysely';

/**
 * Custom ColumnType aliases must be composed directly as `ColumnType<Select, Insert, Update>`
 * for each case — wrapping an already-ColumnType alias in Kysely's `Generated<S>` helper
 * (e.g. `Generated<Timestamp>`) double-wraps incorrectly, because `Generated<S>` is defined
 * as `ColumnType<S, S | undefined, S>` and substitutes S verbatim into all three positions
 * rather than unwrapping a nested ColumnType. `Generated<T>` is only safe to use with plain
 * (non-ColumnType) types such as `string` or `number`.
 */

/** TIMESTAMPTZ NOT NULL DEFAULT now() */
type GeneratedTimestamp = ColumnType<Date, Date | string | undefined, Date | string>;

/** TIMESTAMPTZ, nullable, no default (e.g. issued_at, paid_at, deleted_at) */
type NullableTimestamp = ColumnType<Date | null, Date | string | null | undefined, Date | string | null>;

/** DATE NOT NULL, no default (e.g. due_date, start_date, end_date) */
type DateOnly = ColumnType<Date, Date | string, Date | string>;

/** DATE, nullable, no default (e.g. documents.expiry_date) */
type NullableDateOnly = ColumnType<Date | null, Date | string | null | undefined, Date | string | null>;

/** TIMESTAMPTZ NOT NULL, no default (e.g. gate_passes.valid_from/valid_until) — required at insert, unlike GeneratedTimestamp. */
type RequiredTimestamp = ColumnType<Date, Date | string, Date | string>;

/**
 * BIGINT kobo column, NOT NULL, no default. node-postgres returns int8 as a
 * string to avoid silent precision loss above Number.MAX_SAFE_INTEGER, so
 * reads are typed as `string` — application code must convert via
 * `src/common/money.util.ts` (BigInt) before doing arithmetic, never `Number(...)`.
 */
type Kobo = ColumnType<string, string | number | bigint, string | number | bigint>;

/** BIGINT kobo column, NOT NULL DEFAULT 0 */
type GeneratedKobo = ColumnType<string, string | number | bigint | undefined, string | number | bigint>;

/**
 * NUMERIC column, nullable, no default (e.g. latitude, size_sqm). node-postgres
 * returns numeric as a string by default (same precision rationale as Kobo);
 * these aren't monetary, so ordinary `number` is accepted on write.
 */
type NullableNumeric = ColumnType<string | null, string | number | null | undefined, string | number | null>;

/** NUMERIC column, NOT NULL DEFAULT <value> (e.g. lease_tenants.liability_share_percent). */
type GeneratedNumeric = ColumnType<string, string | number | undefined, string | number>;

/** NUMERIC column, NOT NULL, no default (e.g. meter_readings.reading_value, utility_invoices.consumption). */
type RequiredNumeric = ColumnType<string, string | number, string | number>;

export interface OrganisationsTable {
  id: Generated<string>;
  name: string;
  slug: string;
  country_code: string;
  default_currency: string;
  timezone: string;
  plan: string;
  is_active: boolean;
  created_at: GeneratedTimestamp;
  updated_at: GeneratedTimestamp;
  deleted_at: NullableTimestamp;
}

export interface UsersTable {
  id: Generated<string>;
  organisation_id: string;
  email: string;
  phone: string | null;
  full_name: string;
  password_hash: string | null;
  mfa_enabled: Generated<boolean>;
  mfa_secret_encrypted: string | null;
  status: Generated<string>;
  last_login_at: NullableTimestamp;
  created_at: GeneratedTimestamp;
  updated_at: GeneratedTimestamp;
  deleted_at: NullableTimestamp;
}

/** organisation_id is null for global system roles (e.g. SuperAdmin), shared across the platform. */
export interface RolesTable {
  id: Generated<string>;
  organisation_id: string | null;
  name: string;
  is_system_role: Generated<boolean>;
  created_at: GeneratedTimestamp;
  updated_at: GeneratedTimestamp;
}

/** Global permission catalog — not tenant-scoped, not subject to RLS (see db/schema.sql section 13 note). */
export interface PermissionsTable {
  id: Generated<string>;
  code: string;
  module: string;
  description: string | null;
  created_at: GeneratedTimestamp;
}

export interface RolePermissionsTable {
  role_id: string;
  permission_id: string;
}

export interface UserRolesTable {
  user_id: string;
  role_id: string;
}

export interface PropertiesTable {
  id: Generated<string>;
  organisation_id: string;
  name: string;
  property_type: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  country_code: Generated<string>;
  latitude: NullableNumeric;
  longitude: NullableNumeric;
  boundary_geojson: string | null;
  total_land_area_sqm: NullableNumeric;
  year_built: number | null;
  created_at: GeneratedTimestamp;
  updated_at: GeneratedTimestamp;
  deleted_at: NullableTimestamp;
}

export interface PropertyOwnersTable {
  property_id: string;
  user_id: string;
}

export interface BlocksTable {
  id: Generated<string>;
  organisation_id: string;
  property_id: string;
  name: string;
  created_at: GeneratedTimestamp;
  updated_at: GeneratedTimestamp;
  deleted_at: NullableTimestamp;
}

export interface FloorsTable {
  id: Generated<string>;
  organisation_id: string;
  block_id: string;
  level_number: number;
  label: string | null;
  floor_plan_url: string | null;
  created_at: GeneratedTimestamp;
  updated_at: GeneratedTimestamp;
  deleted_at: NullableTimestamp;
}

export interface UnitMediaTable {
  id: Generated<string>;
  organisation_id: string;
  unit_id: string;
  media_type: string;
  url: string;
  sort_order: Generated<number>;
  created_at: GeneratedTimestamp;
}

export interface PropertyValuationsTable {
  id: Generated<string>;
  organisation_id: string;
  property_id: string;
  valuation_kobo: Kobo;
  valuation_date: DateOnly;
  valuer_name: string | null;
  source: Generated<string>;
  created_at: GeneratedTimestamp;
}

export interface TenantsTable {
  id: Generated<string>;
  organisation_id: string;
  user_id: string | null;
  full_name: string;
  email: string | null;
  phone: string;
  id_document_type: string | null;
  id_document_url: string | null;
  kyc_status: Generated<string>;
  kyc_provider: string | null;
  kyc_verified_at: NullableTimestamp;
  created_at: GeneratedTimestamp;
  updated_at: GeneratedTimestamp;
  deleted_at: NullableTimestamp;
}

export interface UnitsTable {
  id: Generated<string>;
  organisation_id: string;
  floor_id: string;
  unit_code: string;
  unit_type: string;
  bedrooms: number | null;
  bathrooms: number | null;
  size_sqm: NullableNumeric;
  status: Generated<string>;
  base_rent_kobo: GeneratedKobo;
  service_charge_kobo: GeneratedKobo;
  virtual_tour_url: string | null;
  created_at: GeneratedTimestamp;
  updated_at: GeneratedTimestamp;
  deleted_at: NullableTimestamp;
}

export interface LeasesTable {
  id: Generated<string>;
  organisation_id: string;
  unit_id: string;
  primary_tenant_id: string;
  status: Generated<string>;
  start_date: DateOnly;
  end_date: DateOnly;
  rent_amount_kobo: Kobo;
  rent_frequency: Generated<string>;
  deposit_amount_kobo: GeneratedKobo;
  escalation_percent: NullableNumeric;
  escalation_frequency_months: number | null;
  break_clause_notice_days: number | null;
  subletting_allowed: Generated<boolean>;
  document_id: string | null;
  signed_at: NullableTimestamp;
  esignature_provider: string | null;
  esignature_envelope_id: string | null;
  terminated_at: NullableTimestamp;
  termination_reason: string | null;
  created_at: GeneratedTimestamp;
  updated_at: GeneratedTimestamp;
  deleted_at: NullableTimestamp;
}

export interface LeaseTenantsTable {
  lease_id: string;
  tenant_id: string;
  is_primary: Generated<boolean>;
  liability_share_percent: GeneratedNumeric;
}

export interface LeaseClausesTable {
  id: Generated<string>;
  organisation_id: string;
  lease_id: string;
  clause_type: string;
  clause_text: string;
  created_at: GeneratedTimestamp;
}

export interface InvoicesTable {
  id: Generated<string>;
  organisation_id: string;
  lease_id: string | null;
  unit_id: string | null;
  tenant_id: string | null;
  invoice_number: string;
  invoice_type: string;
  currency: Generated<string>;
  subtotal_kobo: Kobo;
  vat_kobo: GeneratedKobo;
  total_kobo: Kobo;
  amount_paid_kobo: GeneratedKobo;
  status: Generated<string>;
  due_date: DateOnly;
  issued_at: NullableTimestamp;
  created_at: GeneratedTimestamp;
  updated_at: GeneratedTimestamp;
  deleted_at: NullableTimestamp;
}

export interface InvoiceLineItemsTable {
  id: Generated<string>;
  organisation_id: string;
  invoice_id: string;
  description: string;
  quantity: Generated<string>;
  unit_price_kobo: Kobo;
  amount_kobo: Kobo;
  created_at: GeneratedTimestamp;
}

export interface PaymentsTable {
  id: Generated<string>;
  organisation_id: string;
  invoice_id: string | null;
  tenant_id: string | null;
  amount_kobo: Kobo;
  currency: Generated<string>;
  payment_method: string;
  gateway: string | null;
  gateway_reference: string | null;
  status: Generated<string>;
  paid_at: NullableTimestamp;
  created_at: GeneratedTimestamp;
  updated_at: GeneratedTimestamp;
}

export interface PaymentPlansTable {
  id: Generated<string>;
  organisation_id: string;
  invoice_id: string;
  installment_number: number;
  amount_due_kobo: Kobo;
  due_date: DateOnly;
  status: Generated<string>;
  created_at: GeneratedTimestamp;
}

export interface ArrearsTable {
  id: Generated<string>;
  organisation_id: string;
  tenant_id: string;
  invoice_id: string;
  outstanding_kobo: Kobo;
  days_overdue: Generated<number>;
  late_fee_kobo: GeneratedKobo;
  recovery_stage: Generated<string>;
  created_at: GeneratedTimestamp;
  updated_at: GeneratedTimestamp;
}

export interface VendorsTable {
  id: Generated<string>;
  organisation_id: string;
  company_name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  specialty: string | null;
  sla_response_hours: number | null;
  performance_score: NullableNumeric;
  onboarded_at: NullableTimestamp;
  status: Generated<string>;
  created_at: GeneratedTimestamp;
  updated_at: GeneratedTimestamp;
  deleted_at: NullableTimestamp;
}

export interface AssetsTable {
  id: Generated<string>;
  organisation_id: string;
  property_id: string;
  unit_id: string | null;
  name: string;
  asset_type: string;
  qr_code: string | null;
  serial_number: string | null;
  installed_at: DateOnly | null;
  warranty_expiry: DateOnly | null;
  status: Generated<string>;
  created_at: GeneratedTimestamp;
  updated_at: GeneratedTimestamp;
  deleted_at: NullableTimestamp;
}

export interface MaintenanceSchedulesTable {
  id: Generated<string>;
  organisation_id: string;
  asset_id: string;
  frequency_days: number;
  last_performed_at: DateOnly | null;
  next_due_at: DateOnly;
  assigned_vendor_id: string | null;
  created_at: GeneratedTimestamp;
  updated_at: GeneratedTimestamp;
}

export interface WorkOrdersTable {
  id: Generated<string>;
  organisation_id: string;
  property_id: string;
  unit_id: string | null;
  asset_id: string | null;
  raised_by_user_id: string | null;
  assigned_vendor_id: string | null;
  assigned_user_id: string | null;
  title: string;
  description: string | null;
  priority: Generated<string>;
  status: Generated<string>;
  cost_kobo: GeneratedKobo;
  opened_at: GeneratedTimestamp;
  closed_at: NullableTimestamp;
  created_at: GeneratedTimestamp;
  updated_at: GeneratedTimestamp;
}

export interface InventoryItemsTable {
  id: Generated<string>;
  organisation_id: string;
  name: string;
  sku: string | null;
  quantity_on_hand: Generated<number>;
  reorder_level: Generated<number>;
  unit_cost_kobo: GeneratedKobo;
  created_at: GeneratedTimestamp;
  updated_at: GeneratedTimestamp;
}

export interface WorkOrderPartsTable {
  work_order_id: string;
  inventory_item_id: string;
  quantity_used: number;
  cost_kobo: Kobo;
}

export interface VehiclesTable {
  id: Generated<string>;
  organisation_id: string;
  tenant_id: string | null;
  plate_number: string;
  make_model: string | null;
  permit_type: Generated<string>;
  valid_until: DateOnly | null;
  created_at: GeneratedTimestamp;
}

export interface VisitorsTable {
  id: Generated<string>;
  organisation_id: string;
  host_tenant_id: string | null;
  unit_id: string | null;
  full_name: string;
  phone: string | null;
  vehicle_id: string | null;
  is_blacklisted: Generated<boolean>;
  blacklist_reason: string | null;
  created_at: GeneratedTimestamp;
}

export interface GatePassesTable {
  id: Generated<string>;
  organisation_id: string;
  visitor_id: string;
  otp_code: string;
  qr_payload: string;
  valid_from: RequiredTimestamp;
  valid_until: RequiredTimestamp;
  status: Generated<string>;
  checked_in_at: NullableTimestamp;
  checked_out_at: NullableTimestamp;
  created_at: GeneratedTimestamp;
}

export interface GuardsTable {
  id: Generated<string>;
  organisation_id: string;
  user_id: string;
  property_id: string;
  created_at: GeneratedTimestamp;
}

export interface GuardShiftsTable {
  id: Generated<string>;
  organisation_id: string;
  guard_id: string;
  shift_start: RequiredTimestamp;
  shift_end: RequiredTimestamp;
}

export interface PatrolLogsTable {
  id: Generated<string>;
  organisation_id: string;
  guard_shift_id: string;
  checkpoint_name: string;
  logged_at: GeneratedTimestamp;
  notes: string | null;
}

export interface IncidentsTable {
  id: Generated<string>;
  organisation_id: string;
  property_id: string;
  reported_by_user_id: string | null;
  incident_type: string;
  severity: Generated<string>;
  description: string;
  camera_zone: string | null;
  status: Generated<string>;
  occurred_at: GeneratedTimestamp;
  resolved_at: NullableTimestamp;
  created_at: GeneratedTimestamp;
}

export interface MetersTable {
  id: Generated<string>;
  organisation_id: string;
  unit_id: string | null;
  property_id: string;
  meter_type: string;
  is_bulk_meter: Generated<boolean>;
  serial_number: string;
  unit_rate_kobo: GeneratedKobo;
  created_at: GeneratedTimestamp;
  updated_at: GeneratedTimestamp;
}

export interface MeterReadingsTable {
  id: Generated<string>;
  organisation_id: string;
  meter_id: string;
  reading_value: RequiredNumeric;
  reading_source: Generated<string>;
  read_at: GeneratedTimestamp;
  created_at: GeneratedTimestamp;
}

export interface UtilityInvoicesTable {
  id: Generated<string>;
  organisation_id: string;
  meter_id: string;
  invoice_id: string | null;
  period_start: DateOnly;
  period_end: DateOnly;
  consumption: RequiredNumeric;
  amount_kobo: Kobo;
  created_at: GeneratedTimestamp;
}

export interface AnnouncementsTable {
  id: Generated<string>;
  organisation_id: string;
  property_id: string | null;
  title: string;
  body: string;
  channels: Generated<string[]>;
  published_at: NullableTimestamp;
  created_by_user_id: string | null;
  created_at: GeneratedTimestamp;
}

export interface AmenitiesTable {
  id: Generated<string>;
  organisation_id: string;
  property_id: string;
  name: string;
  capacity: number | null;
  booking_fee_kobo: GeneratedKobo;
  created_at: GeneratedTimestamp;
}

export interface BookingsTable {
  id: Generated<string>;
  organisation_id: string;
  amenity_id: string;
  tenant_id: string;
  start_time: RequiredTimestamp;
  end_time: RequiredTimestamp;
  status: Generated<string>;
  created_at: GeneratedTimestamp;
}

export interface ComplaintsTable {
  id: Generated<string>;
  organisation_id: string;
  tenant_id: string;
  property_id: string | null;
  category: string;
  description: string;
  sla_due_at: NullableTimestamp;
  status: Generated<string>;
  created_at: GeneratedTimestamp;
  resolved_at: NullableTimestamp;
}

export interface DisputesTable {
  id: Generated<string>;
  organisation_id: string;
  complaint_id: string | null;
  lease_id: string | null;
  raised_by_user_id: string | null;
  dispute_type: string;
  status: Generated<string>;
  resolution_notes: string | null;
  created_at: GeneratedTimestamp;
  resolved_at: NullableTimestamp;
}

export interface PollsTable {
  id: Generated<string>;
  organisation_id: string;
  property_id: string | null;
  question: string;
  opens_at: RequiredTimestamp;
  closes_at: RequiredTimestamp;
  created_at: GeneratedTimestamp;
}

export interface PollOptionsTable {
  id: Generated<string>;
  organisation_id: string;
  poll_id: string;
  option_text: string;
}

export interface PollVotesTable {
  id: Generated<string>;
  organisation_id: string;
  poll_option_id: string;
  tenant_id: string;
  voted_at: GeneratedTimestamp;
}

export interface DocumentsTable {
  id: Generated<string>;
  organisation_id: string;
  property_id: string | null;
  unit_id: string | null;
  tenant_id: string | null;
  lease_id: string | null;
  document_type: string;
  title: string;
  current_version_id: string | null;
  expiry_date: NullableDateOnly;
  access_level: Generated<string>;
  created_at: GeneratedTimestamp;
  updated_at: GeneratedTimestamp;
  deleted_at: NullableTimestamp;
}

export interface DocumentVersionsTable {
  id: Generated<string>;
  organisation_id: string;
  document_id: string;
  version_number: number;
  file_url: string;
  file_hash: string | null;
  uploaded_by_user_id: string | null;
  created_at: GeneratedTimestamp;
}

export interface ExpiryAlertsTable {
  id: Generated<string>;
  organisation_id: string;
  document_id: string;
  alert_date: DateOnly;
  channel: Generated<string>;
  sent_at: NullableTimestamp;
  created_at: GeneratedTimestamp;
}

/** Append-only: the DB blocks UPDATE/DELETE on this table via rules (see db/schema.sql section 11), so there is no Updateable type for it. */
export interface AuditLogsTable {
  id: Generated<string>;
  organisation_id: string;
  actor_user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  before_state: unknown | null;
  after_state: unknown | null;
  ip_address: string | null;
  user_agent: string | null;
  occurred_at: GeneratedTimestamp;
}

export interface InquiriesTable {
  id: Generated<string>;
  organisation_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  message: string | null;
  status: Generated<string>;
  created_at: GeneratedTimestamp;
  updated_at: GeneratedTimestamp;
}

export interface Database {
  organisations: OrganisationsTable;
  users: UsersTable;
  roles: RolesTable;
  permissions: PermissionsTable;
  role_permissions: RolePermissionsTable;
  user_roles: UserRolesTable;
  properties: PropertiesTable;
  property_owners: PropertyOwnersTable;
  blocks: BlocksTable;
  floors: FloorsTable;
  unit_media: UnitMediaTable;
  property_valuations: PropertyValuationsTable;
  tenants: TenantsTable;
  units: UnitsTable;
  leases: LeasesTable;
  lease_tenants: LeaseTenantsTable;
  lease_clauses: LeaseClausesTable;
  invoices: InvoicesTable;
  invoice_line_items: InvoiceLineItemsTable;
  payments: PaymentsTable;
  payment_plans: PaymentPlansTable;
  arrears: ArrearsTable;
  vendors: VendorsTable;
  assets: AssetsTable;
  maintenance_schedules: MaintenanceSchedulesTable;
  work_orders: WorkOrdersTable;
  inventory_items: InventoryItemsTable;
  work_order_parts: WorkOrderPartsTable;
  vehicles: VehiclesTable;
  visitors: VisitorsTable;
  gate_passes: GatePassesTable;
  guards: GuardsTable;
  guard_shifts: GuardShiftsTable;
  patrol_logs: PatrolLogsTable;
  incidents: IncidentsTable;
  meters: MetersTable;
  meter_readings: MeterReadingsTable;
  utility_invoices: UtilityInvoicesTable;
  announcements: AnnouncementsTable;
  amenities: AmenitiesTable;
  bookings: BookingsTable;
  complaints: ComplaintsTable;
  disputes: DisputesTable;
  polls: PollsTable;
  poll_options: PollOptionsTable;
  poll_votes: PollVotesTable;
  documents: DocumentsTable;
  document_versions: DocumentVersionsTable;
  expiry_alerts: ExpiryAlertsTable;
  audit_logs: AuditLogsTable;
  inquiries: InquiriesTable;
}
