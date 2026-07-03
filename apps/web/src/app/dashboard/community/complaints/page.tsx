import { api } from "@/lib/api/server-client";
import { fetchOrForbidden } from "@/lib/api/safe-fetch";
import { ForbiddenNotice } from "@/components/dashboard/forbidden-notice";
import { StatusFilter } from "@/components/dashboard/status-filter";
import { Pagination } from "@/components/dashboard/pagination";
import { CreateComplaintDialog } from "@/components/community/create-complaint-dialog";
import { ComplaintStatusSelect } from "@/components/community/complaint-status-select";
import { formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const COMPLAINT_STATUSES = ["open", "in_review", "resolved", "escalated"];

interface Complaint {
  id: string;
  tenant_name: string;
  category: string;
  description: string;
  status: string;
  sla_due_at: string | null;
  created_at: string;
}

interface Tenant {
  id: string;
  full_name: string;
}

interface ComplaintListResponse {
  rows: Complaint[];
  total: number;
  page: number;
  pageSize: number;
}

export default async function ComplaintsListPage({
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

  const [{ data, forbidden }, { data: tenants }] = await Promise.all([
    fetchOrForbidden(() => api.get<ComplaintListResponse>(`/complaints?${query.toString()}`)),
    fetchOrForbidden(() => api.get<Tenant[]>("/tenants")),
  ]);
  const complaints = data?.rows;
  const totalPages = Math.max(Math.ceil((data?.total ?? 0) / (data?.pageSize ?? 20)), 1);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Complaints</h1>
          <p className="text-sm text-muted-foreground">{forbidden ? "" : `${data?.total ?? 0} complaints`}</p>
        </div>
        <div className="flex items-center gap-3">
          {!forbidden && (
            <StatusFilter
              basePath="/dashboard/community/complaints"
              statuses={COMPLAINT_STATUSES}
              current={params.status}
            />
          )}
          {!forbidden && <CreateComplaintDialog tenants={tenants ?? []} />}
        </div>
      </div>

      {forbidden ? (
        <ForbiddenNotice message="You don't have permission to view complaints." />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Complaint register</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>SLA due</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {complaints?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No complaints found.
                    </TableCell>
                  </TableRow>
                )}
                {complaints?.map((complaint) => (
                  <TableRow key={complaint.id}>
                    <TableCell className="font-medium">{complaint.tenant_name}</TableCell>
                    <TableCell className="capitalize">{complaint.category}</TableCell>
                    <TableCell className="max-w-xs truncate">{complaint.description}</TableCell>
                    <TableCell>{complaint.sla_due_at ? formatDate(complaint.sla_due_at) : "—"}</TableCell>
                    <TableCell>
                      <ComplaintStatusSelect complaintId={complaint.id} status={complaint.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {!forbidden && (
        <Pagination basePath="/dashboard/community/complaints" page={page} totalPages={totalPages} status={params.status} />
      )}
    </div>
  );
}
