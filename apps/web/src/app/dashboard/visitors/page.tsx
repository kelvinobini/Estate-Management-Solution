import Link from "next/link";
import { api } from "@/lib/api/server-client";
import { fetchOrForbidden } from "@/lib/api/safe-fetch";
import { ForbiddenNotice } from "@/components/dashboard/forbidden-notice";
import { Pagination } from "@/components/dashboard/pagination";
import { CreateVisitorDialog } from "@/components/access/create-visitor-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Visitor {
  id: string;
  full_name: string;
  phone: string | null;
  host_tenant_name: string | null;
  is_blacklisted: boolean;
}

interface VisitorListResponse {
  rows: Visitor[];
  total: number;
  page: number;
  pageSize: number;
}

interface Tenant {
  id: string;
  full_name: string;
}

export default async function VisitorsListPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = params.page ? Number(params.page) : 1;

  const [{ data, forbidden }, { data: tenants }] = await Promise.all([
    fetchOrForbidden(() => api.get<VisitorListResponse>(`/visitors?page=${page}&pageSize=20`)),
    fetchOrForbidden(() => api.get<Tenant[]>("/tenants")),
  ]);
  const totalPages = data ? Math.max(Math.ceil(data.total / data.pageSize), 1) : 1;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Visitors</h1>
          <p className="text-sm text-muted-foreground">{forbidden ? "" : `${data?.total ?? 0} visitors`}</p>
        </div>
        {!forbidden && <CreateVisitorDialog tenants={tenants ?? []} />}
      </div>

      {forbidden ? (
        <ForbiddenNotice message="You don't have permission to view visitors." />
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Visitor register</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Host tenant</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No visitors yet.
                      </TableCell>
                    </TableRow>
                  )}
                  {data?.rows.map((visitor) => (
                    <TableRow key={visitor.id}>
                      <TableCell>
                        <Link
                          href={`/dashboard/visitors/${visitor.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {visitor.full_name}
                        </Link>
                      </TableCell>
                      <TableCell>{visitor.phone ?? "—"}</TableCell>
                      <TableCell>{visitor.host_tenant_name ?? "—"}</TableCell>
                      <TableCell>
                        {visitor.is_blacklisted ? (
                          <Badge variant="destructive">Blacklisted</Badge>
                        ) : (
                          <Badge variant="outline">Active</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Pagination basePath="/dashboard/visitors" page={page} totalPages={totalPages} />
        </>
      )}
    </div>
  );
}
