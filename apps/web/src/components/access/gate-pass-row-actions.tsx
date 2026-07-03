"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { checkOutGatePassAction, revokeGatePassAction } from "@/app/dashboard/gate/actions";

export function GatePassRowActions({ gatePassId, status }: { gatePassId: string; status: string }) {
  const [isPending, startTransition] = useTransition();

  function handleCheckOut() {
    startTransition(async () => {
      const result = await checkOutGatePassAction(gatePassId);
      if (result.ok) {
        toast.success("Visitor checked out");
      } else {
        toast.error(result.message ?? "Unable to check out");
      }
    });
  }

  function handleRevoke() {
    startTransition(async () => {
      const result = await revokeGatePassAction(gatePassId);
      if (result.ok) {
        toast.success("Gate pass revoked");
      } else {
        toast.error(result.message ?? "Unable to revoke gate pass");
      }
    });
  }

  if (status === "checked_in") {
    return (
      <Button size="sm" variant="outline" disabled={isPending} onClick={handleCheckOut}>
        Check out
      </Button>
    );
  }

  if (status === "issued") {
    return (
      <Button size="sm" variant="destructive" disabled={isPending} onClick={handleRevoke}>
        Revoke
      </Button>
    );
  }

  return null;
}
