import Link from "next/link";
import { notFound } from "next/navigation";
import { api } from "@/lib/api/server-client";
import { fetchOrForbidden } from "@/lib/api/safe-fetch";
import { BackendError } from "@/lib/auth/backend";
import { formatDate, formatNaira } from "@/lib/format";
import { WorkOrderStatusBadge } from "@/components/maintenance/work-order-status-badge";
import { PriorityBadge } from "@/components/maintenance/priority-badge";
import { WorkOrderActions } from "@/components/maintenance/work-order-actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

interface WorkOrder {
  id: string;
  property_id: string;
  unit_id: string | null;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  cost_kobo: string;
  opened_at: string;
  closed_at: string | null;
  assigned_vendor_id: string | null;
  assigned_user_id: string | null;
}

interface Vendor {
  id: string;
  company_name: string;
}

interface StaffUser {
  id: string;
  full_name: string;
  role_names: string[];
}

export default async function WorkOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let workOrder: WorkOrder;
  try {
    workOrder = await api.get<WorkOrder>(`/work-orders/${id}`);
  } catch (error) {
    if (error instanceof BackendError && error.status === 404) notFound();
    throw error;
  }

  const [{ data: vendors }, { data: users }] = await Promise.all([
    fetchOrForbidden(() => api.get<Vendor[]>("/vendors")),
    fetchOrForbidden(() => api.get<StaffUser[]>("/users")),
  ]);
  const staff = (users ?? []).filter((person) => person.role_names.includes("MaintenanceStaff"));
  const assignedVendor = vendors?.find((vendor) => vendor.id === workOrder.assigned_vendor_id);
  const assignedStaff = staff.find((member) => member.id === workOrder.assigned_user_id);
  const assignedToLabel = assignedStaff?.full_name ?? assignedVendor?.company_name ?? "Unassigned";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/dashboard/maintenance/work-orders"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to work orders
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{workOrder.title}</h1>
            <p className="text-sm text-muted-foreground">Opened {formatDate(workOrder.opened_at)}</p>
          </div>
          <div className="flex items-center gap-3">
            <PriorityBadge priority={workOrder.priority} />
            <WorkOrderStatusBadge status={workOrder.status} />
            <WorkOrderActions workOrderId={workOrder.id} status={workOrder.status} vendors={vendors ?? []} staff={staff} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard label="Assigned to" value={assignedToLabel} />
        <SummaryCard label="Cost so far" value={formatNaira(workOrder.cost_kobo)} />
        <SummaryCard label="Closed" value={workOrder.closed_at ? formatDate(workOrder.closed_at) : "—"} />
      </div>

      {workOrder.description && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Description</CardTitle>
            <CardDescription>Reported issue details.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">{workOrder.description}</CardContent>
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
