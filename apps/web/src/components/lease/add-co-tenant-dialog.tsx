"use client";

import { useState, type FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateDialog } from "@/hooks/use-create-dialog";
import { Plus } from "lucide-react";

interface Tenant {
  id: string;
  full_name: string;
}

export function AddCoTenantDialog({ leaseId, tenants }: { leaseId: string; tenants: Tenant[] }) {
  const { open, setOpen, error, submitting, submit } = useCreateDialog(
    `/api/leases/${leaseId}/co-tenants`,
    "Co-tenant added",
  );
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [liabilityShare, setLiabilityShare] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!tenantId) return;

    const ok = await submit({
      tenantId,
      liabilitySharePercent: liabilityShare || undefined,
    });
    if (ok) {
      setTenantId(null);
      setLiabilityShare("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="size-4" />
        Add co-tenant
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Add co-tenant</DialogTitle>
          </DialogHeader>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex flex-col gap-2">
            <Label htmlFor="tenantId">Tenant</Label>
            <Select value={tenantId ?? undefined} onValueChange={setTenantId}>
              <SelectTrigger id="tenantId" className="w-full">
                <SelectValue placeholder="Select a tenant" />
              </SelectTrigger>
              <SelectContent>
                {tenants.map((tenant) => (
                  <SelectItem key={tenant.id} value={tenant.id}>
                    {tenant.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="liabilityShare">Liability share % (optional)</Label>
            <Input
              id="liabilityShare"
              inputMode="decimal"
              placeholder="e.g. 50"
              value={liabilityShare}
              onChange={(e) => setLiabilityShare(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={submitting || !tenantId}>
              {submitting ? "Adding…" : "Add co-tenant"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
