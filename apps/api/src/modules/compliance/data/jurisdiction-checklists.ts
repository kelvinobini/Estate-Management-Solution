/**
 * Static reference data: required compliance items per jurisdiction. This is
 * informational reference content, not per-organisation tracked state — there
 * is no schema for "checklist item completion status" yet (would need a new
 * table mapping org/property to checklist item + completion date), so this
 * only answers "what's required here", not "have we done it".
 */
export interface ChecklistItem {
  code: string;
  title: string;
  description: string;
  /** Related document_type values from the Documents module, where the requirement is evidenced by an uploaded certificate. */
  evidenceDocumentTypes?: string[];
}

export interface JurisdictionChecklist {
  jurisdiction: string;
  title: string;
  items: ChecklistItem[];
}

export const JURISDICTION_CHECKLISTS: Record<string, JurisdictionChecklist> = {
  'NG-LAGOS': {
    jurisdiction: 'NG-LAGOS',
    title: 'Nigeria — Lagos State Tenancy Law & Land Use Act',
    items: [
      {
        code: 'lagos-tenancy-notice-periods',
        title: 'Statutory notice periods observed',
        description: 'Lagos Tenancy Law 2011 mandates minimum notice periods before termination (e.g. 6 months for yearly tenancies) — enforced via lease.break_clause_notice_days.',
      },
      {
        code: 'lagos-rent-receipt',
        title: 'Rent receipts issued for every payment',
        description: 'Landlords/agents must issue a receipt for every rent payment received.',
      },
      {
        code: 'land-use-act-registration',
        title: 'Governor’s consent / title registration current',
        description: 'Land Use Act requires the Governor’s consent for assignment or sublease of land held under a Certificate of Occupancy.',
        evidenceDocumentTypes: ['certificate_of_occupancy', 'governors_consent'],
      },
      {
        code: 'fire-safety-certificate',
        title: 'Valid fire safety certificate',
        description: 'Lagos State Safety Commission requires periodic fire safety certification for multi-tenant buildings.',
        evidenceDocumentTypes: ['fire_safety_cert'],
      },
    ],
  },
  'UK': {
    jurisdiction: 'UK',
    title: 'United Kingdom — RICS / ARLA Propertymark standards',
    items: [
      {
        code: 'deposit-protection',
        title: 'Tenancy deposit protected in a government-approved scheme',
        description: 'Deposits for assured shorthold tenancies must be protected within 30 days of receipt (Housing Act 2004).',
      },
      {
        code: 'gas-safety-certificate',
        title: 'Annual Gas Safety Certificate (CP12)',
        description: 'Required annually for any property with gas appliances.',
        evidenceDocumentTypes: ['gas_safety_certificate'],
      },
      {
        code: 'epc-rating',
        title: 'Valid Energy Performance Certificate (EPC), rating E or above',
        description: 'Minimum Energy Efficiency Standards (MEES) — a property cannot lawfully be let below an E rating without a valid exemption.',
        evidenceDocumentTypes: ['epc_rating'],
      },
      {
        code: 'electrical-safety-report',
        title: 'Electrical Installation Condition Report (EICR), renewed every 5 years',
        description: 'Mandatory under the Electrical Safety Standards Regulations 2020.',
        evidenceDocumentTypes: ['electrical_certification'],
      },
      {
        code: 'right-to-rent-check',
        title: 'Right to Rent immigration check completed for all tenants',
        description: 'Immigration Act 2014 requires landlords/agents to verify tenants have the right to rent in the UK.',
      },
    ],
  },
};

export function getJurisdictionChecklist(jurisdiction: string): JurisdictionChecklist | undefined {
  return JURISDICTION_CHECKLISTS[jurisdiction.toUpperCase()];
}

export function listSupportedJurisdictions(): string[] {
  return Object.keys(JURISDICTION_CHECKLISTS);
}
