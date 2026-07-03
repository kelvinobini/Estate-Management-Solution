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
import { blacklistVisitorAction, unblacklistVisitorAction } from "@/app/dashboard/visitors/actions";

export function VisitorBlacklistActions({ visitorId, isBlacklisted }: { visitorId: string; isBlacklisted: boolean }) {
  const [isPending, startTransition] = useTransition();

  if (!isBlacklisted) {
    return <BlacklistDialog visitorId={visitorId} disabled={isPending} />;
  }

  function handleUnblacklist() {
    startTransition(async () => {
      const result = await unblacklistVisitorAction(visitorId);
      if (result.ok) {
        toast.success("Visitor removed from blacklist");
      } else {
        toast.error(result.message ?? "Unable to remove from blacklist");
      }
    });
  }

  return (
    <Button size="sm" variant="outline" disabled={isPending} onClick={handleUnblacklist}>
      Remove from blacklist
    </Button>
  );
}

function BlacklistDialog({ visitorId, disabled }: { visitorId: string; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = await blacklistVisitorAction(visitorId, reason);
      if (result.ok) {
        toast.success("Visitor blacklisted");
        setOpen(false);
        setReason("");
      } else {
        toast.error(result.message ?? "Unable to blacklist visitor");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="destructive" disabled={disabled} />}>
        Blacklist
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Blacklist visitor</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="reason">Reason</Label>
            <Input
              id="reason"
              required
              minLength={5}
              placeholder="e.g. Attempted unauthorized entry"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="submit" variant="destructive" disabled={isPending || reason.length < 5}>
              Blacklist visitor
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
