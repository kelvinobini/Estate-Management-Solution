import Link from "next/link";
import { api } from "@/lib/api/server-client";
import { fetchOrForbidden } from "@/lib/api/safe-fetch";
import { ForbiddenNotice } from "@/components/dashboard/forbidden-notice";
import { StatusFilter } from "@/components/dashboard/status-filter";
import { Pagination } from "@/components/dashboard/pagination";
import { LeaseStatusBadge } from "@/components/lease/lease-status-badge";
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

const LEASE_STATUSES = ["draft", "pending_signature", "active", "renewed", "terminated", "expired"];

interface Lease {
  id: string;
  tenant_name: string;
  unit_code: string;
  status: string;
  start_date: string;
  end_date: string;
  rent_amount_kobo: string;
}

interface LeaseListResponse {
  rows: Lease[];
  total: number;
  page: number;
  pageSize: number;
}

export default async function LeasesListPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const page = params.page ? Number(params.page) : 1;
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  query.set("page", String(page));
  query.set("pageSize", "20");

  const { data, forbidden } = await fetchOrForbidden(() =>
    api.get<LeaseListResponse>(`/leases?${query.toString()}`),
  );
  const totalPages = data ? Math.max(Math.ceil(data.total / data.pageSize), 1) : 1;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Leases</h1>
          <p className="text-sm text-muted-foreground">{forbidden ? "" : `${data?.total ?? 0} total leases`}</p>
        </div>
        {!forbidden && (
          <StatusFilter basePath="/dashboard/leases" statuses={LEASE_STATUSES} current={params.status} />
        )}
      </div>

      {forbidden ? (
        <ForbiddenNotice message="You don't have permission to view leases." />
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lease register</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Unit</TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead className="text-right">Rent</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No leases found.
                      </TableCell>
                    </TableRow>
                  )}
                  {data?.rows.map((lease) => (
                    <TableRow key={lease.id}>
                      <TableCell>
                        <Link
                          href={`/dashboard/leases/${lease.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {lease.unit_code}
                        </Link>
                      </TableCell>
                      <TableCell>{lease.tenant_name}</TableCell>
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

          <Pagination basePath="/dashboard/leases" page={page} totalPages={totalPages} status={params.status} />
        </>
      )}
    </div>
  );
}
