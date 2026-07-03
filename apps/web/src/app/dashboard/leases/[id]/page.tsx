import Link from "next/link";
import { notFound } from "next/navigation";
import { api } from "@/lib/api/server-client";
import { fetchOrForbidden } from "@/lib/api/safe-fetch";
import { BackendError } from "@/lib/auth/backend";
import { formatDate, formatNaira } from "@/lib/format";
import { LeaseStatusBadge } from "@/components/lease/lease-status-badge";
import { LeaseActions } from "@/components/lease/lease-actions";
import { DisputeStatusBadge } from "@/components/community/dispute-status-badge";
import { DisputeStatusActions } from "@/components/community/dispute-status-actions";
import { CreateDisputeDialog } from "@/components/community/create-dispute-dialog";
import { AddCoTenantDialog } from "@/components/lease/add-co-tenant-dialog";
import { AddClauseDialog } from "@/components/lease/add-clause-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";

interface Lease {
  id: string;
  unit_id: string;
  primary_tenant_id: string;
  status: string;
  start_date: string;
  end_date: string;
  rent_amount_kobo: string;
  rent_frequency: string;
  deposit_amount_kobo: string;
  escalation_percent: string | null;
  subletting_allowed: boolean;
  termination_reason: string | null;
}

interface Tenant {
  id: string;
  full_name: string;
}

interface Unit {
  id: string;
  unit_code: string;
}

interface Dispute {
  id: string;
  dispute_type: string;
  status: string;
  resolution_notes: string | null;
  created_at: string;
}

interface CoTenant {
  tenant_id: string;
  tenant_name: string;
  is_primary: boolean;
  liability_share_percent: string;
}

interface Clause {
  id: string;
  clause_type: string;
  clause_text: string;
}

interface TenantOption {
  id: string;
  full_name: string;
}

export default async function LeaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let lease: Lease;
  try {
    lease = await api.get<Lease>(`/leases/${id}`);
  } catch (error) {
    if (error instanceof BackendError && error.status === 404) notFound();
    throw error;
  }

  const [tenant, unit] = await Promise.all([
    api.get<Tenant>(`/tenants/${lease.primary_tenant_id}`),
    api.get<Unit>(`/units/${lease.unit_id}`),
  ]);
  const { data: disputes, forbidden: disputesForbidden } = await fetchOrForbidden(() =>
    api.get<Dispute[]>(`/disputes/lease/${id}`),
  );
  const { data: coTenants, forbidden: coTenantsForbidden } = await fetchOrForbidden(() =>
    api.get<CoTenant[]>(`/leases/${id}/co-tenants`),
  );
  const { data: clauses, forbidden: clausesForbidden } = await fetchOrForbidden(() =>
    api.get<Clause[]>(`/leases/${id}/clauses`),
  );
  const { data: tenantOptions } = await fetchOrForbidden(() => api.get<TenantOption[]>("/tenants"));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/dashboard/leases"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to leases
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Unit{" "}
              <Link href={`/dashboard/units/${unit.id}`} className="text-primary hover:underline">
                {unit.unit_code}
              </Link>
            </h1>
            <p className="text-sm text-muted-foreground">
              Tenant:{" "}
              <Link href={`/dashboard/tenants/${tenant.id}`} className="text-primary hover:underline">
                {tenant.full_name}
              </Link>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <LeaseStatusBadge status={lease.status} />
            <LeaseActions leaseId={lease.id} status={lease.status} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Start date" value={formatDate(lease.start_date)} />
        <SummaryCard label="End date" value={formatDate(lease.end_date)} />
        <SummaryCard label="Rent" value={`${formatNaira(lease.rent_amount_kobo)} / ${lease.rent_frequency}`} />
        <SummaryCard label="Deposit" value={formatNaira(lease.deposit_amount_kobo)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lease terms</CardTitle>
          <CardDescription>Additional terms on this lease.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <TermRow
            label="Escalation"
            value={lease.escalation_percent ? `${lease.escalation_percent}% per renewal` : "None"}
          />
          <TermRow label="Subletting allowed" value={lease.subletting_allowed ? "Yes" : "No"} />
          {lease.termination_reason && (
            <TermRow label="Termination reason" value={lease.termination_reason} />
          )}
        </CardContent>
      </Card>

      {!coTenantsForbidden && (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Co-tenants</CardTitle>
              <CardDescription>Everyone named on this lease, and their liability share.</CardDescription>
            </div>
            <AddCoTenantDialog
              leaseId={id}
              tenants={(tenantOptions ?? []).filter(
                (option) => !coTenants?.some((coTenant) => coTenant.tenant_id === option.id),
              )}
            />
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Liability share</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coTenants?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No co-tenants on this lease.
                    </TableCell>
                  </TableRow>
                )}
                {coTenants?.map((coTenant) => (
                  <TableRow key={coTenant.tenant_id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/tenants/${coTenant.tenant_id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {coTenant.tenant_name}
                      </Link>
                    </TableCell>
                    <TableCell>{coTenant.is_primary ? "Primary" : "Co-tenant"}</TableCell>
                    <TableCell className="text-right">{coTenant.liability_share_percent}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {!clausesForbidden && (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Clauses</CardTitle>
              <CardDescription>Additional negotiated terms beyond the standard lease template.</CardDescription>
            </div>
            <AddClauseDialog leaseId={id} />
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Text</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clauses?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground">
                      No additional clauses on this lease.
                    </TableCell>
                  </TableRow>
                )}
                {clauses?.map((clause) => (
                  <TableRow key={clause.id}>
                    <TableCell className="capitalize">{clause.clause_type.replace(/_/g, " ")}</TableCell>
                    <TableCell className="text-muted-foreground">{clause.clause_text}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {!disputesForbidden && (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Disputes</CardTitle>
              <CardDescription>Deposit, rent, or maintenance disputes tied to this lease.</CardDescription>
            </div>
            <CreateDisputeDialog leaseId={id} />
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Logged</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Resolution</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {disputes?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No disputes on this lease.
                    </TableCell>
                  </TableRow>
                )}
                {disputes?.map((dispute) => (
                  <TableRow key={dispute.id}>
                    <TableCell className="capitalize">{dispute.dispute_type.replace(/_/g, " ")}</TableCell>
                    <TableCell>{formatDate(dispute.created_at)}</TableCell>
                    <TableCell>
                      <DisputeStatusBadge status={dispute.status} />
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground">
                      {dispute.resolution_notes ?? "—"}
                    </TableCell>
                    <TableCell>
                      <DisputeStatusActions leaseId={id} disputeId={dispute.id} status={dispute.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function TermRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
