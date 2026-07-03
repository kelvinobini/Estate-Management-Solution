import Link from "next/link";
import { api } from "@/lib/api/server-client";
import { fetchOrForbidden } from "@/lib/api/safe-fetch";
import { ForbiddenNotice } from "@/components/dashboard/forbidden-notice";
import { WorkOrderStatusBadge } from "@/components/maintenance/work-order-status-badge";
import { PriorityBadge } from "@/components/maintenance/priority-badge";
import { CreateWorkOrderDialog } from "@/components/maintenance/create-work-order-dialog";
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

const STATUSES = ["open", "assigned", "in_progress", "on_hold", "closed", "cancelled"] as const;

interface WorkOrder {
  id: string;
  title: string;
  priority: string;
  status: string;
  opened_at: string;
}

interface WorkOrderListResponse {
  rows: WorkOrder[];
  total: number;
  page: number;
  pageSize: number;
}

interface Property {
  id: string;
  name: string;
}

export default async function WorkOrdersListPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const status = STATUSES.includes(params.status as (typeof STATUSES)[number]) ? params.status! : "open";
  const page = params.page ? Number(params.page) : 1;

  const [{ data, forbidden }, { data: properties }] = await Promise.all([
    fetchOrForbidden(() => api.get<WorkOrderListResponse>(`/work-orders?status=${status}&page=${page}&pageSize=20`)),
    fetchOrForbidden(() => api.get<Property[]>("/properties")),
  ]);
  const workOrders = data?.rows;
  const totalPages = Math.max(Math.ceil((data?.total ?? 0) / (data?.pageSize ?? 20)), 1);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Work orders</h1>
          <p className="text-sm text-muted-foreground">Maintenance requests across the portfolio.</p>
        </div>
        {!forbidden && properties && properties.length > 0 && <CreateWorkOrderDialog properties={properties} />}
      </div>

      <StatusTabs current={status} />

      {forbidden ? (
        <ForbiddenNotice message="You don't have permission to view work orders." />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base capitalize">{status.replace(/_/g, " ")} work orders</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Opened</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workOrders?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No work orders with this status.
                    </TableCell>
                  </TableRow>
                )}
                {workOrders?.map((workOrder) => (
                  <TableRow key={workOrder.id}>
                    <TableCell>
                      <Link
                        href={`/dashboard/maintenance/work-orders/${workOrder.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {workOrder.title}
                      </Link>
                    </TableCell>
                    <TableCell>{formatDate(workOrder.opened_at)}</TableCell>
                    <TableCell>
                      <PriorityBadge priority={workOrder.priority} />
                    </TableCell>
                    <TableCell>
                      <WorkOrderStatusBadge status={workOrder.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {!forbidden && (
        <Pagination basePath="/dashboard/maintenance/work-orders" page={page} totalPages={totalPages} status={status} />
      )}
    </div>
  );
}

function StatusTabs({ current }: { current: string }) {
  return (
    <div className="flex w-fit flex-wrap gap-1 rounded-lg border bg-muted/30 p-1">
      {STATUSES.map((status) => (
        <Link
          key={status}
          href={`/dashboard/maintenance/work-orders?status=${status}`}
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
