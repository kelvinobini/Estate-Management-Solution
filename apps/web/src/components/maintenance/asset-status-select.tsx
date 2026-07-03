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
import { updateAssetStatusAction } from "@/app/dashboard/maintenance/assets/actions";

const STATUSES = ["operational", "faulty", "decommissioned"];

export function AssetStatusSelect({ assetId, status }: { assetId: string; status: string }) {
  const [isPending, startTransition] = useTransition();

  function handleChange(value: string | null) {
    if (!value || value === status) return;
    startTransition(async () => {
      const result = await updateAssetStatusAction(assetId, value);
      if (result.ok) {
        toast.success(`Marked ${value}`);
      } else {
        toast.error(result.message ?? "Unable to update status");
      }
    });
  }

  return (
    <Select value={status} onValueChange={handleChange} disabled={isPending}>
      <SelectTrigger className="w-44" size="sm">
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
