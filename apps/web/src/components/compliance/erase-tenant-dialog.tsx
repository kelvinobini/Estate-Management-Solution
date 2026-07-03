"use client";

import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { eraseTenantDataAction } from "@/app/dashboard/tenants/actions";

export function EraseTenantDialog({ tenantId, tenantName }: { tenantId: string; tenantName: string }) {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = await eraseTenantDataAction(tenantId);
      if (result.ok) {
        toast.success("Tenant data erased");
        setOpen(false);
        setConfirmation("");
      } else {
        toast.error(result.message ?? "Unable to erase tenant data");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="destructive" />}>Erase data (NDPR)</DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Erase tenant data</DialogTitle>
            <DialogDescription>
              This permanently anonymizes {tenantName}&apos;s personal data (NDPR/GDPR right to erasure). It cannot
              be undone, and is blocked if the tenant has any active or draft lease.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Label htmlFor="confirmation">
              Type <span className="font-semibold">{tenantName}</span> to confirm
            </Label>
            <Input id="confirmation" required value={confirmation} onChange={(e) => setConfirmation(e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="submit" variant="destructive" disabled={isPending || confirmation !== tenantName}>
              {isPending ? "Erasing…" : "Erase permanently"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
