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

interface Vendor {
  id: string;
  company_name: string;
}

export function CreateScheduleDialog({ assetId, vendors }: { assetId: string; vendors: Vendor[] }) {
  const { open, setOpen, error, submitting, submit } = useCreateDialog(
    `/api/assets/${assetId}/schedules`,
    "Maintenance schedule created",
  );

  const [frequencyDays, setFrequencyDays] = useState("");
  const [assignedVendorId, setAssignedVendorId] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ok = await submit({
      frequencyDays: Number(frequencyDays),
      assignedVendorId: assignedVendorId ?? undefined,
    });
    if (ok) {
      setFrequencyDays("");
      setAssignedVendorId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="size-4" />
        Add schedule
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Add preventive maintenance schedule</DialogTitle>
          </DialogHeader>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex flex-col gap-2">
            <Label htmlFor="frequencyDays">Frequency (days)</Label>
            <Input
              id="frequencyDays"
              type="number"
              min={1}
              required
              placeholder="e.g. 90"
              value={frequencyDays}
              onChange={(e) => setFrequencyDays(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="assignedVendorId">Vendor (optional)</Label>
            <Select value={assignedVendorId ?? undefined} onValueChange={setAssignedVendorId}>
              <SelectTrigger id="assignedVendorId" className="w-full">
                <SelectValue placeholder="No vendor assigned" />
              </SelectTrigger>
              <SelectContent>
                {vendors.map((vendor) => (
                  <SelectItem key={vendor.id} value={vendor.id}>
                    {vendor.company_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={submitting || !frequencyDays}>
              {submitting ? "Creating…" : "Create schedule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
