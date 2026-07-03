import Link from "next/link";
import { api } from "@/lib/api/server-client";
import { fetchOrForbidden } from "@/lib/api/safe-fetch";
import { ForbiddenNotice } from "@/components/dashboard/forbidden-notice";
import { PropertyFilter } from "@/components/reports/property-filter";
import { formatDate, formatNaira } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";

interface RentRollRow {
  lease_id: string;
  unit_code: string;
  tenant_name: string;
  rent_amount_kobo: string;
  rent_frequency: string;
  start_date: string;
  end_date: string;
}

interface Property {
  id: string;
  name: string;
}

export default async function RentRollPage({
  searchParams,
}: {
  searchParams: Promise<{ propertyId?: string }>;
}) {
  const params = await searchParams;
  const query = params.propertyId ? `?propertyId=${params.propertyId}` : "";

  const [{ data: rows, forbidden }, { data: properties }] = await Promise.all([
    fetchOrForbidden(() => api.get<RentRollRow[]>(`/reports/rent-roll${query}`)),
    fetchOrForbidden(() => api.get<Property[]>("/properties")),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/dashboard/reports"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to reports
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Rent roll</h1>
            <p className="text-sm text-muted-foreground">{forbidden ? "" : `${rows?.length ?? 0} active leases`}</p>
          </div>
          {!forbidden && (
            <PropertyFilter
              basePath="/dashboard/reports/rent-roll"
              properties={properties ?? []}
              current={params.propertyId}
            />
          )}
        </div>
      </div>

      {forbidden ? (
        <ForbiddenNotice message="You don't have permission to view the rent roll." />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Active and renewed leases</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unit</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead className="text-right">Rent</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No active leases.
                    </TableCell>
                  </TableRow>
                )}
                {rows?.map((row) => (
                  <TableRow key={row.lease_id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/leases/${row.lease_id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {row.unit_code}
                      </Link>
                    </TableCell>
                    <TableCell>{row.tenant_name}</TableCell>
                    <TableCell className="text-right">
                      {formatNaira(row.rent_amount_kobo)} / {row.rent_frequency}
                    </TableCell>
                    <TableCell>{formatDate(row.start_date)}</TableCell>
                    <TableCell>{formatDate(row.end_date)}</TableCell>
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
