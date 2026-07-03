-- EstateCore — Database Schema (Deliverable 2)
-- Target: PostgreSQL 15+
-- Market baseline: Nigeria (NGN). Multi-currency columns included for global extensibility.
--
-- Conventions:
--   * UUID primary keys (gen_random_uuid()).
--   * Every tenant-scoped table has organisation_id NOT NULL + a row-level security policy
--     (see section 12) so a missing WHERE clause in application code cannot leak cross-tenant data.
--   * Money is stored as BIGINT kobo (1 naira = 100 kobo) — never floating point.
--   * Timestamps are TIMESTAMPTZ (UTC); created_at/updated_at on every table, deleted_at for soft delete.
--   * Status/type vocabularies use TEXT + CHECK rather than native ENUM types, so new values can be
--     added with a lightweight ALTER TABLE ... DROP/ADD CONSTRAINT instead of ALTER TYPE.

CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS citext;     -- case-insensitive email columns
CREATE EXTENSION IF NOT EXISTS pg_trgm;    -- fuzzy name/address search

-- =====================================================================================
-- 1. ORGANISATIONS (tenants of the SaaS platform — i.e. an estate management company)
-- =====================================================================================

CREATE TABLE organisations (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name              VARCHAR(255) NOT NULL,
    slug              VARCHAR(100) NOT NULL UNIQUE,
    country_code      CHAR(2) NOT NULL DEFAULT 'NG',
    default_currency  CHAR(3) NOT NULL DEFAULT 'NGN',
    timezone          VARCHAR(64) NOT NULL DEFAULT 'Africa/Lagos',
    plan              VARCHAR(50) NOT NULL DEFAULT 'starter',
    is_active         BOOLEAN NOT NULL DEFAULT true,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at        TIMESTAMPTZ
);

-- =====================================================================================
-- 2. IDENTITY & RBAC
-- =====================================================================================

CREATE TABLE permissions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code        VARCHAR(150) NOT NULL UNIQUE,   -- e.g. 'lease.create', 'invoice.void'
    module      VARCHAR(50) NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- organisation_id NULL => global system role (SuperAdmin) shared across the platform
CREATE TABLE roles (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id  UUID REFERENCES organisations(id) ON DELETE CASCADE,
    name             VARCHAR(100) NOT NULL,
    is_system_role   BOOLEAN NOT NULL DEFAULT false,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (organisation_id, name)
);

CREATE TABLE role_permissions (
    role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE users (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id       UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    email                 CITEXT NOT NULL,
    phone                 VARCHAR(20),
    full_name             VARCHAR(255) NOT NULL,
    password_hash         TEXT,                 -- NULL when the user is SSO-only
    mfa_enabled           BOOLEAN NOT NULL DEFAULT false,
    mfa_secret_encrypted  TEXT,
    status                VARCHAR(20) NOT NULL DEFAULT 'active'
                              CHECK (status IN ('invited','active','suspended','disabled')),
    last_login_at         TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at            TIMESTAMPTZ,
    UNIQUE (organisation_id, email)
);

CREATE TABLE user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- =====================================================================================
-- 3. PROPERTY & UNIT MANAGEMENT
-- =====================================================================================

CREATE TABLE properties (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id       UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    name                  VARCHAR(255) NOT NULL,
    property_type         VARCHAR(30) NOT NULL
                              CHECK (property_type IN ('residential','commercial','serviced_apartment','mixed_use')),
    address_line1         VARCHAR(255) NOT NULL,
    address_line2         VARCHAR(255),
    city                  VARCHAR(100) NOT NULL,
    state                 VARCHAR(100) NOT NULL,
    country_code          CHAR(2) NOT NULL DEFAULT 'NG',
    latitude              NUMERIC(9,6),
    longitude             NUMERIC(9,6),
    boundary_geojson      JSONB,                -- GIS polygon for property boundary
    total_land_area_sqm   NUMERIC(12,2),
    year_built            SMALLINT,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at            TIMESTAMPTZ
);
CREATE INDEX idx_properties_org ON properties(organisation_id);
CREATE INDEX idx_properties_geo ON properties(latitude, longitude);

-- Join table: a property can have multiple co-owners, and one owner (landlord
-- portal login) can own multiple properties — mirrors user_roles/lease_tenants
-- (composite PK, no surrogate id, no timestamps).
CREATE TABLE property_owners (
    property_id  UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (property_id, user_id)
);

CREATE TABLE blocks (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id  UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    property_id      UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    name             VARCHAR(100) NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at       TIMESTAMPTZ,
    UNIQUE (property_id, name)
);
CREATE INDEX idx_blocks_org ON blocks(organisation_id);

CREATE TABLE floors (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id  UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    block_id         UUID NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
    level_number     SMALLINT NOT NULL,          -- negative values allowed for basements
    label            VARCHAR(50),
    floor_plan_url   TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at       TIMESTAMPTZ,
    UNIQUE (block_id, level_number)
);
CREATE INDEX idx_floors_org ON floors(organisation_id);

CREATE TABLE units (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id       UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    floor_id              UUID NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
    unit_code             VARCHAR(50) NOT NULL,   -- e.g. "3B"
    unit_type             VARCHAR(30) NOT NULL
                              CHECK (unit_type IN ('residential','commercial','serviced_apartment','mixed_use')),
    bedrooms              SMALLINT,
    bathrooms             SMALLINT,
    size_sqm              NUMERIC(10,2),
    status                VARCHAR(20) NOT NULL DEFAULT 'vacant'
                              CHECK (status IN ('vacant','occupied','under_maintenance','reserved')),
    base_rent_kobo        BIGINT NOT NULL DEFAULT 0 CHECK (base_rent_kobo >= 0),
    service_charge_kobo   BIGINT NOT NULL DEFAULT 0 CHECK (service_charge_kobo >= 0),
    virtual_tour_url      TEXT,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at            TIMESTAMPTZ,
    UNIQUE (floor_id, unit_code)
);
CREATE INDEX idx_units_org ON units(organisation_id);
CREATE INDEX idx_units_status ON units(status);

CREATE TABLE unit_media (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id  UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    unit_id          UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    media_type       VARCHAR(20) NOT NULL CHECK (media_type IN ('image','video','floor_plan','3d_tour')),
    url              TEXT NOT NULL,
    sort_order       SMALLINT NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_unit_media_unit ON unit_media(unit_id);

CREATE TABLE property_valuations (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id  UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    property_id      UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    valuation_kobo   BIGINT NOT NULL CHECK (valuation_kobo >= 0),
    valuation_date   DATE NOT NULL,
    valuer_name      VARCHAR(255),
    source           VARCHAR(50) NOT NULL DEFAULT 'manual'
                        CHECK (source IN ('manual','market_comparison','automated')),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_valuations_property ON property_valuations(property_id, valuation_date DESC);

-- =====================================================================================
-- 4. TENANT & LEASE MANAGEMENT
-- =====================================================================================

CREATE TABLE tenants (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id     UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    user_id             UUID REFERENCES users(id) ON DELETE SET NULL,  -- tenant portal login, if any
    full_name           VARCHAR(255) NOT NULL,
    email               CITEXT,
    phone               VARCHAR(20) NOT NULL,
    id_document_type    VARCHAR(30) CHECK (id_document_type IN ('national_id','passport','drivers_license','voters_card')),
    id_document_url     TEXT,
    kyc_status          VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (kyc_status IN ('pending','verified','rejected')),
    kyc_provider        VARCHAR(30),             -- SmileIdentity, Youverify
    kyc_verified_at     TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at          TIMESTAMPTZ
);
CREATE INDEX idx_tenants_org ON tenants(organisation_id);

CREATE TABLE leases (
    id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id               UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    unit_id                       UUID NOT NULL REFERENCES units(id) ON DELETE RESTRICT,
    primary_tenant_id             UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    status                        VARCHAR(20) NOT NULL DEFAULT 'draft'
                                      CHECK (status IN ('draft','pending_signature','active','renewed','terminated','expired')),
    start_date                    DATE NOT NULL,
    end_date                      DATE NOT NULL,
    rent_amount_kobo              BIGINT NOT NULL CHECK (rent_amount_kobo >= 0),
    rent_frequency                VARCHAR(20) NOT NULL DEFAULT 'annual'
                                      CHECK (rent_frequency IN ('monthly','quarterly','biannual','annual')),
    deposit_amount_kobo           BIGINT NOT NULL DEFAULT 0 CHECK (deposit_amount_kobo >= 0),
    escalation_percent            NUMERIC(5,2) DEFAULT 0,
    escalation_frequency_months   SMALLINT,
    break_clause_notice_days      SMALLINT,
    subletting_allowed            BOOLEAN NOT NULL DEFAULT false,
    document_id                   UUID,          -- FK added after `documents` exists (section 8)
    signed_at                     TIMESTAMPTZ,
    esignature_provider           VARCHAR(30),   -- DocuSign, AdobeSign
    esignature_envelope_id        VARCHAR(255),
    terminated_at                 TIMESTAMPTZ,
    termination_reason            TEXT,
    created_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                    TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at                    TIMESTAMPTZ,
    CHECK (end_date > start_date)
);
CREATE INDEX idx_leases_org ON leases(organisation_id);
CREATE INDEX idx_leases_unit ON leases(unit_id);
CREATE INDEX idx_leases_status ON leases(status);

-- joint/co-tenancy support
CREATE TABLE lease_tenants (
    lease_id                 UUID NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
    tenant_id                UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    is_primary               BOOLEAN NOT NULL DEFAULT false,
    liability_share_percent  NUMERIC(5,2) NOT NULL DEFAULT 100,
    PRIMARY KEY (lease_id, tenant_id)
);

CREATE TABLE lease_clauses (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id  UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    lease_id         UUID NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
    clause_type      VARCHAR(50) NOT NULL,   -- break_clause, pet_policy, maintenance_responsibility, ...
    clause_text      TEXT NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_lease_clauses_lease ON lease_clauses(lease_id);

-- =====================================================================================
-- 5. FINANCIAL MANAGEMENT
-- =====================================================================================

CREATE TABLE invoices (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id    UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    lease_id           UUID REFERENCES leases(id) ON DELETE SET NULL,
    unit_id            UUID REFERENCES units(id) ON DELETE SET NULL,
    tenant_id          UUID REFERENCES tenants(id) ON DELETE SET NULL,
    invoice_number     VARCHAR(50) NOT NULL,
    invoice_type       VARCHAR(30) NOT NULL
                          CHECK (invoice_type IN ('rent','service_charge','utility','late_fee','deposit','other')),
    currency           CHAR(3) NOT NULL DEFAULT 'NGN',
    subtotal_kobo      BIGINT NOT NULL CHECK (subtotal_kobo >= 0),
    vat_kobo           BIGINT NOT NULL DEFAULT 0 CHECK (vat_kobo >= 0),
    total_kobo         BIGINT NOT NULL CHECK (total_kobo >= 0),
    amount_paid_kobo   BIGINT NOT NULL DEFAULT 0 CHECK (amount_paid_kobo >= 0),
    status             VARCHAR(20) NOT NULL DEFAULT 'draft'
                          CHECK (status IN ('draft','issued','partially_paid','paid','overdue','void')),
    due_date           DATE NOT NULL,
    issued_at          TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at         TIMESTAMPTZ,
    UNIQUE (organisation_id, invoice_number)
);
CREATE INDEX idx_invoices_org ON invoices(organisation_id);
CREATE INDEX idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX idx_invoices_status_due ON invoices(status, due_date);

CREATE TABLE invoice_line_items (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id   UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    invoice_id        UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description       VARCHAR(255) NOT NULL,
    quantity          NUMERIC(10,2) NOT NULL DEFAULT 1,
    unit_price_kobo   BIGINT NOT NULL CHECK (unit_price_kobo >= 0),
    amount_kobo       BIGINT NOT NULL CHECK (amount_kobo >= 0),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_invoice_line_items_invoice ON invoice_line_items(invoice_id);

CREATE TABLE payments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id     UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    invoice_id          UUID REFERENCES invoices(id) ON DELETE SET NULL,
    tenant_id           UUID REFERENCES tenants(id) ON DELETE SET NULL,
    amount_kobo         BIGINT NOT NULL CHECK (amount_kobo > 0),
    currency            CHAR(3) NOT NULL DEFAULT 'NGN',
    payment_method      VARCHAR(30) NOT NULL
                           CHECK (payment_method IN ('card','bank_transfer','direct_debit','cash','ussd','wallet')),
    gateway             VARCHAR(30) CHECK (gateway IN ('paystack','flutterwave','remita','manual')),
    gateway_reference   VARCHAR(255),
    status              VARCHAR(20) NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending','successful','failed','reversed')),
    paid_at             TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (gateway, gateway_reference)
);
CREATE INDEX idx_payments_org ON payments(organisation_id);
CREATE INDEX idx_payments_invoice ON payments(invoice_id);

CREATE TABLE payment_plans (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id     UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    invoice_id          UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    installment_number  SMALLINT NOT NULL,
    amount_due_kobo     BIGINT NOT NULL CHECK (amount_due_kobo >= 0),
    due_date            DATE NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','overdue')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (invoice_id, installment_number)
);

CREATE TABLE arrears (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id   UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    invoice_id        UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    outstanding_kobo  BIGINT NOT NULL CHECK (outstanding_kobo >= 0),
    days_overdue      INTEGER NOT NULL DEFAULT 0,
    late_fee_kobo     BIGINT NOT NULL DEFAULT 0 CHECK (late_fee_kobo >= 0),
    recovery_stage    VARCHAR(30) NOT NULL DEFAULT 'reminder'
                         CHECK (recovery_stage IN ('reminder','notice','legal_referral','resolved')),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_arrears_tenant ON arrears(tenant_id);

-- =====================================================================================
-- 6. FACILITY & MAINTENANCE MANAGEMENT
-- =====================================================================================

CREATE TABLE vendors (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id       UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    company_name          VARCHAR(255) NOT NULL,
    contact_name          VARCHAR(255),
    phone                 VARCHAR(20),
    email                 CITEXT,
    specialty             VARCHAR(100),          -- HVAC, electrical, plumbing, elevators, generators
    sla_response_hours    SMALLINT,
    performance_score     NUMERIC(3,2) CHECK (performance_score BETWEEN 0 AND 5),
    onboarded_at          TIMESTAMPTZ,
    status                VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('pending','active','suspended')),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at            TIMESTAMPTZ
);
CREATE INDEX idx_vendors_org ON vendors(organisation_id);

CREATE TABLE assets (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id   UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    property_id       UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    unit_id           UUID REFERENCES units(id) ON DELETE SET NULL,
    name              VARCHAR(255) NOT NULL,
    asset_type        VARCHAR(50) NOT NULL,      -- elevator, generator, hvac_unit, fire_panel, water_pump
    qr_code           VARCHAR(100) UNIQUE,
    serial_number     VARCHAR(100),
    installed_at      DATE,
    warranty_expiry   DATE,
    status            VARCHAR(20) NOT NULL DEFAULT 'operational'
                         CHECK (status IN ('operational','faulty','decommissioned')),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at        TIMESTAMPTZ
);
CREATE INDEX idx_assets_org ON assets(organisation_id);
CREATE INDEX idx_assets_property ON assets(property_id);

CREATE TABLE maintenance_schedules (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id       UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    asset_id              UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    frequency_days        INTEGER NOT NULL CHECK (frequency_days > 0),
    last_performed_at     DATE,
    next_due_at           DATE NOT NULL,
    assigned_vendor_id    UUID REFERENCES vendors(id) ON DELETE SET NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_maint_schedules_next_due ON maintenance_schedules(next_due_at);

CREATE TABLE work_orders (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id       UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    property_id           UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    unit_id               UUID REFERENCES units(id) ON DELETE SET NULL,
    asset_id              UUID REFERENCES assets(id) ON DELETE SET NULL,
    raised_by_user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_vendor_id    UUID REFERENCES vendors(id) ON DELETE SET NULL,
    assigned_user_id      UUID REFERENCES users(id) ON DELETE SET NULL,  -- internal staff assignee (MaintenanceStaff role), independent of assigned_vendor_id
    title                 VARCHAR(255) NOT NULL,
    description           TEXT,
    priority              VARCHAR(20) NOT NULL DEFAULT 'medium'
                             CHECK (priority IN ('low','medium','high','emergency')),
    status                VARCHAR(20) NOT NULL DEFAULT 'open'
                             CHECK (status IN ('open','assigned','in_progress','on_hold','closed','cancelled')),
    cost_kobo             BIGINT NOT NULL DEFAULT 0 CHECK (cost_kobo >= 0),
    opened_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
    closed_at             TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_work_orders_org ON work_orders(organisation_id);
CREATE INDEX idx_work_orders_status ON work_orders(status);
CREATE INDEX idx_work_orders_assigned_user ON work_orders(assigned_user_id);

CREATE TABLE inventory_items (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id   UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    name              VARCHAR(255) NOT NULL,
    sku               VARCHAR(100),
    quantity_on_hand  INTEGER NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),
    reorder_level     INTEGER NOT NULL DEFAULT 0,
    unit_cost_kobo    BIGINT NOT NULL DEFAULT 0 CHECK (unit_cost_kobo >= 0),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE work_order_parts (
    work_order_id       UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
    inventory_item_id   UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
    quantity_used       INTEGER NOT NULL CHECK (quantity_used > 0),
    cost_kobo           BIGINT NOT NULL CHECK (cost_kobo >= 0),
    PRIMARY KEY (work_order_id, inventory_item_id)
);

-- =====================================================================================
-- 7. VISITOR & ACCESS MANAGEMENT
-- =====================================================================================

CREATE TABLE vehicles (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id   UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    tenant_id         UUID REFERENCES tenants(id) ON DELETE SET NULL,
    plate_number      VARCHAR(20) NOT NULL,
    make_model        VARCHAR(100),
    permit_type       VARCHAR(20) NOT NULL DEFAULT 'resident' CHECK (permit_type IN ('resident','visitor')),
    valid_until       DATE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (organisation_id, plate_number)
);

CREATE TABLE visitors (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id   UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    host_tenant_id    UUID REFERENCES tenants(id) ON DELETE SET NULL,
    unit_id           UUID REFERENCES units(id) ON DELETE SET NULL,
    full_name         VARCHAR(255) NOT NULL,
    phone             VARCHAR(20),
    vehicle_id        UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    is_blacklisted    BOOLEAN NOT NULL DEFAULT false,
    blacklist_reason  TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_visitors_org ON visitors(organisation_id);

CREATE TABLE gate_passes (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id  UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    visitor_id       UUID NOT NULL REFERENCES visitors(id) ON DELETE CASCADE,
    otp_code         VARCHAR(10) NOT NULL,
    qr_payload       TEXT NOT NULL,
    valid_from       TIMESTAMPTZ NOT NULL,
    valid_until      TIMESTAMPTZ NOT NULL,
    status           VARCHAR(20) NOT NULL DEFAULT 'issued'
                        CHECK (status IN ('issued','checked_in','checked_out','expired','revoked')),
    checked_in_at    TIMESTAMPTZ,
    checked_out_at   TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (valid_until > valid_from)
);
CREATE INDEX idx_gate_passes_org ON gate_passes(organisation_id);
CREATE INDEX idx_gate_passes_status ON gate_passes(status);

CREATE TABLE guards (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id  UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    property_id      UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE guard_shifts (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id  UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    guard_id         UUID NOT NULL REFERENCES guards(id) ON DELETE CASCADE,
    shift_start      TIMESTAMPTZ NOT NULL,
    shift_end        TIMESTAMPTZ NOT NULL,
    CHECK (shift_end > shift_start)
);

CREATE TABLE patrol_logs (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id  UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    guard_shift_id   UUID NOT NULL REFERENCES guard_shifts(id) ON DELETE CASCADE,
    checkpoint_name  VARCHAR(100) NOT NULL,
    logged_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    notes            TEXT
);

CREATE TABLE incidents (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id       UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    property_id           UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    reported_by_user_id   UUID REFERENCES users(id) ON DELETE SET NULL,
    incident_type         VARCHAR(50) NOT NULL,   -- security_breach, theft, fire, altercation
    severity              VARCHAR(20) NOT NULL DEFAULT 'low' CHECK (severity IN ('low','medium','high','critical')),
    description           TEXT NOT NULL,
    camera_zone           VARCHAR(100),           -- CCTV metadata reference
    status                VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open','investigating','resolved')),
    occurred_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at           TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_incidents_org ON incidents(organisation_id);

-- =====================================================================================
-- 8. UTILITIES MANAGEMENT
-- =====================================================================================

CREATE TABLE meters (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id  UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    unit_id          UUID REFERENCES units(id) ON DELETE CASCADE,       -- NULL for a bulk/property-level meter
    property_id      UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    meter_type       VARCHAR(20) NOT NULL CHECK (meter_type IN ('electricity','water','gas','generator_diesel')),
    is_bulk_meter    BOOLEAN NOT NULL DEFAULT false,
    serial_number    VARCHAR(100) NOT NULL,
    unit_rate_kobo   BIGINT NOT NULL DEFAULT 0 CHECK (unit_rate_kobo >= 0),  -- per kWh / litre
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (organisation_id, serial_number)
);
CREATE INDEX idx_meters_property ON meters(property_id);

CREATE TABLE meter_readings (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id   UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    meter_id          UUID NOT NULL REFERENCES meters(id) ON DELETE CASCADE,
    reading_value     NUMERIC(14,3) NOT NULL,
    reading_source    VARCHAR(20) NOT NULL DEFAULT 'manual' CHECK (reading_source IN ('manual','iot_sensor')),
    read_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_meter_readings_meter ON meter_readings(meter_id, read_at DESC);

CREATE TABLE utility_invoices (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id  UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    meter_id         UUID NOT NULL REFERENCES meters(id) ON DELETE CASCADE,
    invoice_id       UUID REFERENCES invoices(id) ON DELETE SET NULL,
    period_start     DATE NOT NULL,
    period_end       DATE NOT NULL,
    consumption      NUMERIC(14,3) NOT NULL CHECK (consumption >= 0),
    amount_kobo      BIGINT NOT NULL CHECK (amount_kobo >= 0),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (period_end > period_start)
);

-- =====================================================================================
-- 9. DOCUMENT MANAGEMENT
-- =====================================================================================

CREATE TABLE documents (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id      UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    property_id          UUID REFERENCES properties(id) ON DELETE CASCADE,
    unit_id              UUID REFERENCES units(id) ON DELETE CASCADE,
    tenant_id            UUID REFERENCES tenants(id) ON DELETE CASCADE,
    lease_id             UUID REFERENCES leases(id) ON DELETE CASCADE,
    document_type        VARCHAR(50) NOT NULL,   -- lease, insurance_certificate, fire_safety_cert, id_document, ...
    title                VARCHAR(255) NOT NULL,
    current_version_id   UUID,                   -- FK added below, after document_versions exists
    expiry_date          DATE,
    access_level         VARCHAR(20) NOT NULL DEFAULT 'restricted'
                            CHECK (access_level IN ('public','restricted','confidential')),
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at           TIMESTAMPTZ
);
CREATE INDEX idx_documents_org ON documents(organisation_id);
CREATE INDEX idx_documents_expiry ON documents(expiry_date);

CREATE TABLE document_versions (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id       UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    document_id           UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version_number        INTEGER NOT NULL,
    file_url              TEXT NOT NULL,
    file_hash             VARCHAR(64),            -- SHA-256, for integrity verification / audit
    uploaded_by_user_id   UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (document_id, version_number)
);

ALTER TABLE documents
    ADD CONSTRAINT fk_documents_current_version
    FOREIGN KEY (current_version_id) REFERENCES document_versions(id) ON DELETE SET NULL;

ALTER TABLE leases
    ADD CONSTRAINT fk_leases_document
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL;

CREATE TABLE expiry_alerts (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id  UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    document_id      UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    alert_date       DATE NOT NULL,
    channel          VARCHAR(20) NOT NULL DEFAULT 'email' CHECK (channel IN ('email','sms','push','in_app')),
    sent_at          TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================================
-- 10. COMMUNITY & COMMUNICATION
-- =====================================================================================

CREATE TABLE announcements (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id      UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    property_id          UUID REFERENCES properties(id) ON DELETE CASCADE,
    title                VARCHAR(255) NOT NULL,
    body                 TEXT NOT NULL,
    channels             VARCHAR(20)[] NOT NULL DEFAULT ARRAY['in_app'],  -- email, sms, push, in_app
    published_at         TIMESTAMPTZ,
    created_by_user_id   UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_announcements_org ON announcements(organisation_id);

CREATE TABLE amenities (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id    UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    property_id        UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    name               VARCHAR(100) NOT NULL,     -- gym, pool, hall, parking_bay
    capacity           SMALLINT,
    booking_fee_kobo   BIGINT NOT NULL DEFAULT 0 CHECK (booking_fee_kobo >= 0),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE bookings (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id  UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    amenity_id       UUID NOT NULL REFERENCES amenities(id) ON DELETE CASCADE,
    tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    start_time       TIMESTAMPTZ NOT NULL,
    end_time         TIMESTAMPTZ NOT NULL,
    status           VARCHAR(20) NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending','confirmed','cancelled')),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (end_time > start_time)
);
CREATE INDEX idx_bookings_amenity_time ON bookings(amenity_id, start_time, end_time);

CREATE TABLE complaints (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id  UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    property_id      UUID REFERENCES properties(id) ON DELETE SET NULL,
    category         VARCHAR(50) NOT NULL,
    description      TEXT NOT NULL,
    sla_due_at       TIMESTAMPTZ,
    status           VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_review','resolved','escalated')),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at      TIMESTAMPTZ
);
CREATE INDEX idx_complaints_org ON complaints(organisation_id);

CREATE TABLE disputes (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id      UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    complaint_id         UUID REFERENCES complaints(id) ON DELETE SET NULL,
    lease_id             UUID REFERENCES leases(id) ON DELETE SET NULL,
    raised_by_user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    dispute_type         VARCHAR(50) NOT NULL,     -- deposit_deduction, rent_dispute, maintenance_liability, ...
    status               VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open','mediation','legal','resolved')),
    resolution_notes     TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at          TIMESTAMPTZ
);

CREATE TABLE polls (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id  UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    property_id      UUID REFERENCES properties(id) ON DELETE CASCADE,
    question         VARCHAR(500) NOT NULL,
    opens_at         TIMESTAMPTZ NOT NULL,
    closes_at        TIMESTAMPTZ NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (closes_at > opens_at)
);

CREATE TABLE poll_options (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id  UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    poll_id          UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
    option_text      VARCHAR(255) NOT NULL
);

CREATE TABLE poll_votes (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id  UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    poll_option_id   UUID NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
    tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    voted_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (poll_option_id, tenant_id)
);

-- =====================================================================================
-- 11. AUDIT LOG (append-only — required for compliance / "who did what, when")
-- =====================================================================================

CREATE TABLE audit_logs (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id   UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    actor_user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    action            VARCHAR(100) NOT NULL,      -- e.g. 'lease.terminated', 'invoice.voided'
    entity_type       VARCHAR(50) NOT NULL,
    entity_id         UUID,
    before_state      JSONB,
    after_state       JSONB,
    ip_address        INET,
    user_agent        TEXT,
    occurred_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_logs_org_time ON audit_logs(organisation_id, occurred_at DESC);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- Enforce true append-only semantics at the database level, not just by convention.
REVOKE UPDATE, DELETE ON audit_logs FROM PUBLIC;
CREATE RULE audit_logs_no_update AS ON UPDATE TO audit_logs DO INSTEAD NOTHING;
CREATE RULE audit_logs_no_delete AS ON DELETE TO audit_logs DO INSTEAD NOTHING;

-- =====================================================================================
-- 12. INQUIRIES (public landing-page "request access" submissions — unauthenticated
--    visitors, reviewed by staff; never creates a login on its own)
-- =====================================================================================

CREATE TABLE inquiries (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organisation_id   UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
    full_name         VARCHAR(255) NOT NULL,
    email             CITEXT NOT NULL,
    phone             VARCHAR(30),
    message           TEXT,
    status            VARCHAR(20) NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','dismissed')),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_inquiries_org ON inquiries(organisation_id);

-- =====================================================================================
-- 13. updated_at TRIGGERS (applied to every table that has the column)
-- =====================================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    t text;
BEGIN
    FOR t IN
        SELECT table_name FROM information_schema.columns
        WHERE table_schema = 'public' AND column_name = 'updated_at'
    LOOP
        EXECUTE format(
            'CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
            t
        );
    END LOOP;
END $$;

-- =====================================================================================
-- 14. ROW-LEVEL SECURITY (multi-tenant isolation)
--
-- Application connections set `app.current_org_id` once per request (from the JWT's
-- org_id claim). Background workers / SuperAdmin operations instead run as a dedicated
-- Postgres role with the BYPASSRLS attribute — the tenant policy itself is never relaxed.
-- =====================================================================================

ALTER TABLE organisations ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON organisations
    USING (id = current_setting('app.current_org_id', true)::uuid);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON users
    USING (organisation_id = current_setting('app.current_org_id', true)::uuid)
    WITH CHECK (organisation_id = current_setting('app.current_org_id', true)::uuid);

-- roles may be global (organisation_id IS NULL, e.g. the system-wide SuperAdmin role)
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON roles
    USING (organisation_id IS NULL OR organisation_id = current_setting('app.current_org_id', true)::uuid);

-- user_roles has no organisation_id of its own, so isolation is enforced via a join to users.
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON user_roles
    USING (EXISTS (
        SELECT 1 FROM users u
        WHERE u.id = user_roles.user_id
          AND u.organisation_id = current_setting('app.current_org_id', true)::uuid
    ));

-- lease_tenants has no organisation_id of its own (composite PK is lease_id + tenant_id),
-- so isolation is enforced via a join to leases. Excluded from the generic loop below,
-- which assumes every table has an organisation_id column.
ALTER TABLE lease_tenants ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON lease_tenants
    USING (EXISTS (
        SELECT 1 FROM leases l
        WHERE l.id = lease_tenants.lease_id
          AND l.organisation_id = current_setting('app.current_org_id', true)::uuid
    ));

-- property_owners has no organisation_id of its own (composite PK is property_id +
-- user_id), so isolation is enforced via a join to properties. Excluded from the
-- generic loop below for the same reason as lease_tenants above.
ALTER TABLE property_owners ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON property_owners
    USING (EXISTS (
        SELECT 1 FROM properties p
        WHERE p.id = property_owners.property_id
          AND p.organisation_id = current_setting('app.current_org_id', true)::uuid
    ));

-- work_order_parts has no organisation_id of its own either; isolation is enforced via
-- a join to work_orders. Also excluded from the generic loop for the same reason.
ALTER TABLE work_order_parts ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON work_order_parts
    USING (EXISTS (
        SELECT 1 FROM work_orders w
        WHERE w.id = work_order_parts.work_order_id
          AND w.organisation_id = current_setting('app.current_org_id', true)::uuid
    ));

DO $$
DECLARE
    t text;
BEGIN
    FOR t IN SELECT unnest(ARRAY[
        'properties','blocks','floors','units','unit_media','property_valuations',
        'tenants','leases','lease_clauses',
        'invoices','invoice_line_items','payments','payment_plans','arrears',
        'vendors','assets','maintenance_schedules','work_orders','inventory_items',
        'vehicles','visitors','gate_passes','guards','guard_shifts','patrol_logs','incidents',
        'meters','meter_readings','utility_invoices',
        'documents','document_versions','expiry_alerts',
        'announcements','amenities','bookings','complaints','disputes','polls','poll_options','poll_votes',
        'audit_logs','inquiries'
    ])
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        EXECUTE format(
            'CREATE POLICY tenant_isolation ON %I
                USING (organisation_id = current_setting(''app.current_org_id'', true)::uuid)
                WITH CHECK (organisation_id = current_setting(''app.current_org_id'', true)::uuid)',
            t
        );
    END LOOP;
END $$;

-- permissions and role_permissions are global catalog tables (no organisation_id) and
-- are intentionally excluded from RLS: they are governed by application-layer authorization,
-- not per-tenant row ownership.
