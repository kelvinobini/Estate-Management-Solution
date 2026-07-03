"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { updateUnitStatusAction } from "@/app/dashboard/units/actions";

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  vacant: ["reserved", "occupied", "under_maintenance"],
  reserved: ["occupied", "vacant"],
  occupied: ["vacant", "under_maintenance"],
  under_maintenance: ["vacant", "occupied"],
};

export function UnitStatusActions({ unitId, status }: { unitId: string; status: string }) {
  const [isPending, startTransition] = useTransition();
  const nextStatuses = ALLOWED_TRANSITIONS[status] ?? [];

  function handleTransition(nextStatus: string) {
    startTransition(async () => {
      const result = await updateUnitStatusAction(unitId, nextStatus);
      if (result.ok) {
        toast.success(`Unit marked ${nextStatus.replace(/_/g, " ")}`);
      } else {
        toast.error(result.message ?? "Unable to update unit status");
      }
    });
  }

  if (nextStatuses.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {nextStatuses.map((next) => (
        <Button key={next} size="sm" variant="outline" disabled={isPending} onClick={() => handleTransition(next)}>
          Mark {next.replace(/_/g, " ")}
        </Button>
      ))}
    </div>
  );
}
