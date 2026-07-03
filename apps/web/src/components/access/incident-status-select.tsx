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
import { updateIncidentStatusAction } from "@/app/dashboard/access/actions";

const STATUSES = ["open", "investigating", "resolved"];

export function IncidentStatusSelect({ incidentId, status }: { incidentId: string; status: string }) {
  const [isPending, startTransition] = useTransition();

  function handleChange(value: string | null) {
    if (!value || value === status) return;
    startTransition(async () => {
      const result = await updateIncidentStatusAction(incidentId, value);
      if (result.ok) {
        toast.success(`Marked ${value}`);
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
            {s}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
