import Link from "next/link";
import { api } from "@/lib/api/server-client";
import { fetchOrForbidden } from "@/lib/api/safe-fetch";
import { ForbiddenNotice } from "@/components/dashboard/forbidden-notice";
import { CheckInForm } from "@/components/access/check-in-form";
import { GatePassStatusBadge } from "@/components/access/gate-pass-status-badge";
import { GatePassRowActions } from "@/components/access/gate-pass-row-actions";
import { Pagination } from "@/components/dashboard/pagination";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STATUSES = ["issued", "checked_in", "checked_out", "expired", "revoked"] as const;

interface GatePass {
  id: string;
  visitor_id: string;
  visitor_name: string;
  otp_code: string;
  status: string;
  valid_from: string;
  valid_until: string;
}

interface GatePassListResponse {
  rows: GatePass[];
  total: number;
  page: number;
  pageSize: number;
}

export default async function GateOperationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const status = STATUSES.includes(params.status as (typeof STATUSES)[number]) ? params.status! : "issued";
  const page = params.page ? Number(params.page) : 1;

  const { data, forbidden } = await fetchOrForbidden(() =>
    api.get<GatePassListResponse>(`/gate-passes?status=${status}&page=${page}&pageSize=20`),
  );
  const gatePasses = data?.rows;
  const totalPages = Math.max(Math.ceil((data?.total ?? 0) / (data?.pageSize ?? 20)), 1);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Gate operations</h1>
        <p className="text-sm text-muted-foreground">Check visitors in and out at the gate.</p>
      </div>

      {!forbidden && <CheckInForm />}

      <StatusTabs current={status} />

      {forbidden ? (
        <ForbiddenNotice message="You don't have permission to view gate passes." />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base capitalize">{status.replace(/_/g, " ")} gate passes</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Visitor</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Valid from</TableHead>
                  <TableHead>Valid until</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {gatePasses?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No gate passes with this status.
                    </TableCell>
                  </TableRow>
                )}
                {gatePasses?.map((pass) => (
                  <TableRow key={pass.id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/visitors/${pass.visitor_id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {pass.visitor_name}
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono">{pass.otp_code}</TableCell>
                    <TableCell>{formatDate(pass.valid_from)}</TableCell>
                    <TableCell>{formatDate(pass.valid_until)}</TableCell>
                    <TableCell>
                      <GatePassStatusBadge status={pass.status} />
                    </TableCell>
                    <TableCell>
                      <GatePassRowActions gatePassId={pass.id} status={pass.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {!forbidden && <Pagination basePath="/dashboard/gate" page={page} totalPages={totalPages} status={status} />}
    </div>
  );
}

function StatusTabs({ current }: { current: string }) {
  return (
    <div className="flex w-fit flex-wrap gap-1 rounded-lg border bg-muted/30 p-1">
      {STATUSES.map((status) => (
        <Link
          key={status}
          href={`/dashboard/gate?status=${status}`}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors",
            status === current
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {status.replace(/_/g, " ")}
        </Link>
      ))}
    </div>
  );
}
