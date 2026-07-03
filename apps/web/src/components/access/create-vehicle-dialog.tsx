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
import { useCreateDialog } from "@/hooks/use-create-dialog";
import { Plus } from "lucide-react";

export function CreateVehicleDialog({ tenantId }: { tenantId: string }) {
  const { open, setOpen, error, submitting, submit } = useCreateDialog("/api/vehicles", "Vehicle registered");

  const [plateNumber, setPlateNumber] = useState("");
  const [makeModel, setMakeModel] = useState("");
  const [validUntil, setValidUntil] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ok = await submit({
      tenantId,
      plateNumber,
      makeModel: makeModel || undefined,
      permitType: "resident",
      validUntil: validUntil || undefined,
    });
    if (ok) {
      setPlateNumber("");
      setMakeModel("");
      setValidUntil("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="size-4" />
        Add vehicle
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Add vehicle</DialogTitle>
          </DialogHeader>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex flex-col gap-2">
            <Label htmlFor="plateNumber">Plate number</Label>
            <Input id="plateNumber" required value={plateNumber} onChange={(e) => setPlateNumber(e.target.value)} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="makeModel">Make / model (optional)</Label>
            <Input id="makeModel" value={makeModel} onChange={(e) => setMakeModel(e.target.value)} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="validUntil">Permit valid until (optional)</Label>
            <Input id="validUntil" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={submitting || !plateNumber}>
              {submitting ? "Adding…" : "Add vehicle"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
