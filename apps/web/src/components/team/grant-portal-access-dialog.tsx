"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KeyRound } from "lucide-react";

export function GrantPortalAccessDialog({
  tenantId,
  tenantName,
  hasPortalAccess,
}: {
  tenantId: string;
  tenantName: string;
  hasPortalAccess: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setError(null);
      setTemporaryPassword(null);
    }
  }

  async function handleGrant() {
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch(`/api/tenants/${tenantId}/portal-access`, { method: "POST" });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.message ?? "Unable to grant portal access");
        return;
      }

      setTemporaryPassword(data.temporaryPassword);
      router.refresh();
    } catch {
      setError("Unable to reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function copyPassword() {
    if (!temporaryPassword) return;
    await navigator.clipboard.writeText(temporaryPassword);
    toast.success("Copied to clipboard");
  }

  if (hasPortalAccess) {
    return <Badge variant="outline">Portal access granted</Badge>;
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <KeyRound className="size-4" />
        Grant portal access
      </DialogTrigger>
      <DialogContent>
        {temporaryPassword ? (
          <div className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Portal access granted</DialogTitle>
              <DialogDescription>
                Share this temporary password with {tenantName} directly — it won&apos;t be shown again. There is no
                email invite yet, so this is the only way to hand it off.
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-lg border bg-muted/40 p-3 font-mono text-sm break-all">{temporaryPassword}</div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={copyPassword}>
                Copy password
              </Button>
              <Button type="button" onClick={() => handleOpenChange(false)}>
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Grant portal access</DialogTitle>
              <DialogDescription>
                Creates a self-service login for {tenantName} with a temporary password, so they can sign in to view
                their own invoices, lease, and other tenant records.
              </DialogDescription>
            </DialogHeader>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <DialogFooter>
              <Button type="button" onClick={handleGrant} disabled={submitting}>
                {submitting ? "Granting…" : "Grant access"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
