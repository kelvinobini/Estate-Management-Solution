"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateComplaintStatusAction } from "@/app/dashboard/community/actions";

const STATUSES = ["open", "in_review", "resolved", "escalated"];

export function ComplaintStatusSelect({ complaintId, status }: { complaintId: string; status: string }) {
  const [isPending, startTransition] = useTransition();

  function handleChange(value: string | null) {
    if (!value || value === status) return;
    startTransition(async () => {
      const result = await updateComplaintStatusAction(complaintId, value);
      if (result.ok) {
        toast.success(`Marked ${value.replace(/_/g, " ")}`);
      } else {
        toast.error(result.message ?? "Unable to update status");
      }
    });
  }

  return (
    <Select value={status} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger className="w-36" size="sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUSES.map((s) => (
          <SelectItem key={s} value={s} className="capitalize">
            {s.replace(/_/g, " ")}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
