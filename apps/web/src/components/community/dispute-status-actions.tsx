"use client";

import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { updateDisputeStatusAction } from "@/app/dashboard/leases/actions";

const NEXT_STATUSES: Record<string, string[]> = {
  open: ["mediation", "legal"],
  mediation: ["legal"],
  legal: [],
};

export function DisputeStatusActions({
  leaseId,
  disputeId,
  status,
}: {
  leaseId: string;
  disputeId: string;
  status: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleTransition(nextStatus: string) {
    startTransition(async () => {
      const result = await updateDisputeStatusAction(leaseId, disputeId, nextStatus);
      if (result.ok) {
        toast.success(`Marked ${nextStatus}`);
      } else {
        toast.error(result.message ?? "Unable to update status");
      }
    });
  }

  if (status === "resolved") return null;

  const nextStatuses = NEXT_STATUSES[status] ?? [];

  return (
    <div className="flex flex-wrap gap-2">
      {nextStatuses.map((next) => (
        <Button key={next} size="sm" variant="outline" disabled={isPending} onClick={() => handleTransition(next)}>
          Move to {next}
        </Button>
      ))}
      <ResolveDialog leaseId={leaseId} disputeId={disputeId} disabled={isPending} />
    </div>
  );
}

function ResolveDialog({
  leaseId,
  disputeId,
  disabled,
}: {
  leaseId: string;
  disputeId: string;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = await updateDisputeStatusAction(leaseId, disputeId, "resolved", resolutionNotes);
      if (result.ok) {
        toast.success("Dispute resolved");
        setOpen(false);
        setResolutionNotes("");
      } else {
        toast.error(result.message ?? "Unable to resolve dispute");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" disabled={disabled} />}>Resolve</DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Resolve dispute</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="resolutionNotes">Resolution notes</Label>
            <Input
              id="resolutionNotes"
              required
              placeholder="How was this resolved?"
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending || !resolutionNotes}>
              Resolve
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
