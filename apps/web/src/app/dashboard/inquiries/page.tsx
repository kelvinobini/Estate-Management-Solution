import { api } from "@/lib/api/server-client";
import { fetchOrForbidden } from "@/lib/api/safe-fetch";
import { ForbiddenNotice } from "@/components/dashboard/forbidden-notice";
import { StatusFilter } from "@/components/dashboard/status-filter";
import { Pagination } from "@/components/dashboard/pagination";
import { InquiryStatusSelect } from "@/components/inquiries/inquiry-status-select";
import { formatDateTime } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const INQUIRY_STATUSES = ["new", "contacted", "dismissed"];

interface Inquiry {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  message: string | null;
  status: string;
  created_at: string;
}

interface InquiryListResponse {
  rows: Inquiry[];
  total: number;
  page: number;
  pageSize: number;
}

export default async function InquiriesListPage({
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

  const { data, forbidden } = await fetchOrForbidden(() => api.get<InquiryListResponse>(`/inquiries?${query.toString()}`));
  const inquiries = data?.rows;
  const totalPages = Math.max(Math.ceil((data?.total ?? 0) / (data?.pageSize ?? 20)), 1);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Access requests</h1>
          <p className="text-sm text-muted-foreground">
            {forbidden ? "" : `${data?.total ?? 0} requests from the landing page`}
          </p>
        </div>
        {!forbidden && <StatusFilter basePath="/dashboard/inquiries" statuses={INQUIRY_STATUSES} current={params.status} />}
      </div>

      {forbidden ? (
        <ForbiddenNotice message="You don't have permission to view access requests." />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Received</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inquiries?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No access requests yet.
                    </TableCell>
                  </TableRow>
                )}
                {inquiries?.map((inquiry) => (
                  <TableRow key={inquiry.id}>
                    <TableCell className="whitespace-nowrap">{formatDateTime(inquiry.created_at)}</TableCell>
                    <TableCell>{inquiry.full_name}</TableCell>
                    <TableCell>{inquiry.email}</TableCell>
                    <TableCell>{inquiry.phone ?? "—"}</TableCell>
                    <TableCell className="max-w-xs truncate">{inquiry.message ?? "—"}</TableCell>
                    <TableCell>
                      <InquiryStatusSelect inquiryId={inquiry.id} status={inquiry.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {!forbidden && (
        <Pagination basePath="/dashboard/inquiries" page={page} totalPages={totalPages} status={params.status} />
      )}
    </div>
  );
}
