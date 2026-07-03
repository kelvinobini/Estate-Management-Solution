import Link from "next/link";
import { notFound } from "next/navigation";
import { api } from "@/lib/api/server-client";
import { BackendError } from "@/lib/auth/backend";
import { fetchOrForbidden } from "@/lib/api/safe-fetch";
import { formatDate, formatNaira } from "@/lib/format";
import { UnitStatusBadge } from "@/components/property/unit-status-badge";
import { UnitStatusActions } from "@/components/property/unit-status-actions";
import { LeaseStatusBadge } from "@/components/lease/lease-status-badge";
import { CreateLeaseDialog } from "@/components/lease/create-lease-dialog";
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

interface Unit {
  id: string;
  unit_code: string;
  unit_type: string;
  status: string;
  bedrooms: number | null;
  bathrooms: number | null;
  size_sqm: string | null;
  base_rent_kobo: string;
  service_charge_kobo: string;
  floor_id: string;
}

interface Floor {
  id: string;
  level_number: number;
  label: string | null;
  block_id: string;
}

interface Block {
  id: string;
  name: string;
  property_id: string;
}

interface Property {
  id: string;
  name: string;
}

interface Lease {
  id: string;
  primary_tenant_id: string;
  tenant_name: string;
  status: string;
  start_date: string;
  end_date: string;
  rent_amount_kobo: string;
}

interface Tenant {
  id: string;
  full_name: string;
}

export default async function UnitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let unit: Unit;
  try {
    unit = await api.get<Unit>(`/units/${id}`);
  } catch (error) {
    if (error instanceof BackendError && error.status === 404) notFound();
    throw error;
  }

  const floor = await api.get<Floor>(`/floors/${unit.floor_id}`);
  const block = await api.get<Block>(`/blocks/${floor.block_id}`);
  const property = await api.get<Property>(`/properties/${block.property_id}`);

  const { data: leases, forbidden: leasesForbidden } = await fetchOrForbidden(() =>
    api.get<Lease[]>(`/leases/unit/${unit.id}`),
  );

  const { data: tenants } = unit.status === "vacant"
    ? await fetchOrForbidden(() => api.get<Tenant[]>("/tenants"))
    : { data: null };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/dashboard/properties/${property.id}/blocks/${block.id}/floors/${floor.id}`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to floor
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{unit.unit_code}</h1>
            <p className="text-sm text-muted-foreground">
              {property.name} — {block.name} — {floor.label ?? `Level ${floor.level_number}`}
            </p>
          </div>
          <UnitStatusBadge status={unit.status} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Bedrooms" value={unit.bedrooms != null ? String(unit.bedrooms) : "—"} />
        <SummaryCard label="Bathrooms" value={unit.bathrooms != null ? String(unit.bathrooms) : "—"} />
        <SummaryCard label="Size" value={unit.size_sqm ? `${unit.size_sqm} sqm` : "—"} />
        <SummaryCard label="Type" value={unit.unit_type.replace(/_/g, " ")} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <SummaryCard label="Base rent" value={formatNaira(unit.base_rent_kobo)} />
        <SummaryCard label="Service charge" value={formatNaira(unit.service_charge_kobo)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status</CardTitle>
          <CardDescription>Valid transitions from the unit&apos;s current status.</CardDescription>
        </CardHeader>
        <CardContent>
          <UnitStatusActions unitId={unit.id} status={unit.status} />
        </CardContent>
      </Card>

      {!leasesForbidden && (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Leases</CardTitle>
              <CardDescription>Lease history for this unit.</CardDescription>
            </div>
            {unit.status === "vacant" && tenants && tenants.length > 0 && (
              <CreateLeaseDialog unitId={unit.id} tenants={tenants} />
            )}
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead className="text-right">Rent</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leases?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No leases yet.
                    </TableCell>
                  </TableRow>
                )}
                {leases?.map((lease) => (
                  <TableRow key={lease.id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/tenants/${lease.primary_tenant_id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {lease.tenant_name}
                      </Link>
                    </TableCell>
                    <TableCell>{formatDate(lease.start_date)}</TableCell>
                    <TableCell>{formatDate(lease.end_date)}</TableCell>
                    <TableCell className="text-right">{formatNaira(lease.rent_amount_kobo)}</TableCell>
                    <TableCell>
                      <LeaseStatusBadge status={lease.status} />
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
        <CardTitle className="text-xl capitalize">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}
