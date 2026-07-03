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
import {
  activateLeaseAction,
  renewLeaseAction,
  submitForSignatureAction,
  terminateLeaseAction,
  type ActionResult,
} from "@/app/dashboard/leases/actions";

export function LeaseActions({ leaseId, status }: { leaseId: string; status: string }) {
  const [isPending, startTransition] = useTransition();
  const [renewOpen, setRenewOpen] = useState(false);
  const [terminateOpen, setTerminateOpen] = useState(false);

  function run(action: () => Promise<ActionResult>, successMessage: string, onSuccess?: () => void) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        toast.success(successMessage);
        onSuccess?.();
      } else {
        toast.error(result.message ?? "Action failed");
      }
    });
  }

  const canSubmitForSignature = status === "draft";
  const canActivate = status === "draft" || status === "pending_signature";
  const canRenewOrTerminate = status === "active" || status === "renewed";

  return (
    <div className="flex flex-wrap gap-2">
      {canSubmitForSignature && (
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => run(() => submitForSignatureAction(leaseId), "Submitted for signature")}
        >
          Submit for signature
        </Button>
      )}

      {canActivate && (
        <Button
          size="sm"
          disabled={isPending}
          onClick={() => run(() => activateLeaseAction(leaseId), "Lease activated")}
        >
          Activate
        </Button>
      )}

      {canRenewOrTerminate && (
        <RenewDialog
          open={renewOpen}
          setOpen={setRenewOpen}
          disabled={isPending}
          onRenew={(newEndDate) =>
            run(() => renewLeaseAction(leaseId, newEndDate), "Lease renewed", () => setRenewOpen(false))
          }
        />
      )}

      {canRenewOrTerminate && (
        <TerminateDialog
          open={terminateOpen}
          setOpen={setTerminateOpen}
          disabled={isPending}
          onTerminate={(reason) =>
            run(() => terminateLeaseAction(leaseId, reason), "Lease terminated", () => setTerminateOpen(false))
          }
        />
      )}
    </div>
  );
}

function RenewDialog({
  open,
  setOpen,
  disabled,
  onRenew,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  disabled: boolean;
  onRenew: (newEndDate: string) => void;
}) {
  const [newEndDate, setNewEndDate] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onRenew(newEndDate);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" disabled={disabled} />}>Renew</DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Renew lease</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="newEndDate">New end date</Label>
            <Input
              id="newEndDate"
              type="date"
              required
              value={newEndDate}
              onChange={(e) => setNewEndDate(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={disabled || !newEndDate}>
              Renew
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TerminateDialog({
  open,
  setOpen,
  disabled,
  onTerminate,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  disabled: boolean;
  onTerminate: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onTerminate(reason);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="destructive" disabled={disabled} />}>
        Terminate
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Terminate lease</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="reason">Reason</Label>
            <Input
              id="reason"
              required
              minLength={5}
              placeholder="e.g. Tenant requested early exit"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="submit" variant="destructive" disabled={disabled || reason.length < 5}>
              Terminate lease
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
