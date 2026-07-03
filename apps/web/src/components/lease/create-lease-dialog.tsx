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
import { nairaInputToKobo } from "@/lib/format";
import { Plus } from "lucide-react";

const RENT_FREQUENCIES = ["monthly", "quarterly", "biannual", "annual"];

interface Tenant {
  id: string;
  full_name: string;
}

export function CreateLeaseDialog({ unitId, tenants }: { unitId: string; tenants: Tenant[] }) {
  const { open, setOpen, error, submitting, submit } = useCreateDialog("/api/leases", "Lease created");

  const [primaryTenantId, setPrimaryTenantId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [rentAmount, setRentAmount] = useState("");
  const [rentFrequency, setRentFrequency] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    if (!primaryTenantId || !rentFrequency) return;

    let rentAmountKobo: string;
    let depositAmountKobo: string | undefined;
    try {
      rentAmountKobo = nairaInputToKobo(rentAmount);
      depositAmountKobo = depositAmount ? nairaInputToKobo(depositAmount) : undefined;
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Enter a valid amount");
      return;
    }

    const ok = await submit({
      unitId,
      primaryTenantId,
      startDate,
      endDate,
      rentAmountKobo,
      rentFrequency,
      depositAmountKobo,
    });
    if (ok) {
      setPrimaryTenantId(null);
      setStartDate("");
      setEndDate("");
      setRentAmount("");
      setRentFrequency(null);
      setDepositAmount("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="size-4" />
        Create lease
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Create lease</DialogTitle>
          </DialogHeader>

          {(error || formError) && <p className="text-sm text-destructive">{error ?? formError}</p>}

          <div className="flex flex-col gap-2">
            <Label htmlFor="primaryTenantId">Tenant</Label>
            <Select value={primaryTenantId ?? undefined} onValueChange={setPrimaryTenantId}>
              <SelectTrigger id="primaryTenantId" className="w-full">
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

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="startDate">Start date</Label>
              <Input
                id="startDate"
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="endDate">End date</Label>
              <Input id="endDate" type="date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="rentAmount">Rent (₦)</Label>
              <Input
                id="rentAmount"
                inputMode="decimal"
                placeholder="0.00"
                required
                value={rentAmount}
                onChange={(e) => setRentAmount(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="rentFrequency">Frequency</Label>
              <Select value={rentFrequency ?? undefined} onValueChange={setRentFrequency}>
                <SelectTrigger id="rentFrequency" className="w-full">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {RENT_FREQUENCIES.map((frequency) => (
                    <SelectItem key={frequency} value={frequency} className="capitalize">
                      {frequency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="depositAmount">Deposit (₦, optional)</Label>
            <Input
              id="depositAmount"
              inputMode="decimal"
              placeholder="0.00"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={submitting || !primaryTenantId || !rentFrequency}>
              {submitting ? "Creating…" : "Create lease"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
