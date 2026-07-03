"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { assignWorkOrderAction, updateWorkOrderStatusAction } from "@/app/dashboard/maintenance/work-orders/actions";

const ALLOWED_STATUS_TRANSITIONS: Record<string, string[]> = {
  open: ["cancelled"],
  assigned: ["in_progress", "cancelled"],
  in_progress: ["on_hold", "closed", "cancelled"],
  on_hold: ["in_progress", "cancelled"],
};

interface Vendor {
  id: string;
  company_name: string;
}

interface StaffMember {
  id: string;
  full_name: string;
}

export function WorkOrderActions({
  workOrderId,
  status,
  vendors,
  staff,
}: {
  workOrderId: string;
  status: string;
  vendors: Vendor[];
  staff: StaffMember[];
}) {
  const [isPending, startTransition] = useTransition();

  function runStatusChange(nextStatus: string) {
    startTransition(async () => {
      const result = await updateWorkOrderStatusAction(workOrderId, nextStatus);
      if (result.ok) {
        toast.success(`Marked ${nextStatus.replace(/_/g, " ")}`);
      } else {
        toast.error(result.message ?? "Unable to update status");
      }
    });
  }

  const nextStatuses = ALLOWED_STATUS_TRANSITIONS[status] ?? [];

  return (
    <div className="flex flex-wrap gap-2">
      {status === "open" && <AssignDialog workOrderId={workOrderId} vendors={vendors} staff={staff} disabled={isPending} />}
      {nextStatuses.map((next) => (
        <Button
          key={next}
          size="sm"
          variant={next === "cancelled" ? "destructive" : "outline"}
          disabled={isPending}
          onClick={() => runStatusChange(next)}
        >
          Mark {next.replace(/_/g, " ")}
        </Button>
      ))}
    </div>
  );
}

function AssignDialog({
  workOrderId,
  vendors,
  staff,
  disabled,
}: {
  workOrderId: string;
  vendors: Vendor[];
  staff: StaffMember[];
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAssign() {
    const assignee = userId ? { userId } : vendorId ? { vendorId } : null;
    if (!assignee) return;
    startTransition(async () => {
      const result = await assignWorkOrderAction(workOrderId, assignee);
      if (result.ok) {
        toast.success("Work order assigned");
        setOpen(false);
      } else {
        toast.error(result.message ?? "Unable to assign work order");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" disabled={disabled} />}>Assign</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign work order</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">External vendor</span>
            <Select
              value={vendorId ?? undefined}
              onValueChange={(value) => {
                setVendorId(value);
                setUserId(null);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a vendor" />
              </SelectTrigger>
              <SelectContent>
                {vendors.map((vendor) => (
                  <SelectItem key={vendor.id} value={vendor.id}>
                    {vendor.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Internal maintenance staff</span>
            <Select
              value={userId ?? undefined}
              onValueChange={(value) => {
                setUserId(value);
                setVendorId(null);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a staff member" />
              </SelectTrigger>
              <SelectContent>
                {staff.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleAssign} disabled={(!vendorId && !userId) || isPending}>
            Assign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
