"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { recordKycDecisionAction } from "@/app/dashboard/tenants/actions";

export function KycActions({ tenantId, kycStatus }: { tenantId: string; kycStatus: string }) {
  const [isPending, startTransition] = useTransition();

  function handleDecision(outcome: "verified" | "rejected") {
    startTransition(async () => {
      const result = await recordKycDecisionAction(tenantId, outcome, "manual");
      if (result.ok) {
        toast.success(`KYC marked ${outcome}`);
      } else {
        toast.error(result.message ?? "Unable to record KYC decision");
      }
    });
  }

  if (kycStatus === "verified") return null;

  return (
    <div className="flex gap-2">
      <Button size="sm" variant="outline" disabled={isPending} onClick={() => handleDecision("verified")}>
        Mark verified
      </Button>
      <Button size="sm" variant="destructive" disabled={isPending} onClick={() => handleDecision("rejected")}>
        Mark rejected
      </Button>
    </div>
  );
}
