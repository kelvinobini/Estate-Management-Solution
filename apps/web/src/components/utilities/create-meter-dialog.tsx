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

const METER_TYPES = ["electricity", "water", "gas", "generator_diesel"];

export function CreateMeterDialog({ propertyId }: { propertyId: string }) {
  const { open, setOpen, error, submitting, submit } = useCreateDialog("/api/meters", "Meter created");

  const [meterType, setMeterType] = useState<string | null>(null);
  const [serialNumber, setSerialNumber] = useState("");
  const [unitRate, setUnitRate] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    if (!meterType) return;

    let unitRateKobo: string | undefined;
    try {
      unitRateKobo = unitRate ? nairaInputToKobo(unitRate) : undefined;
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Enter a valid rate");
      return;
    }

    const ok = await submit({ propertyId, meterType, serialNumber, unitRateKobo });
    if (ok) {
      setMeterType(null);
      setSerialNumber("");
      setUnitRate("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="size-4" />
        Add meter
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Add meter</DialogTitle>
          </DialogHeader>

          {(error || formError) && <p className="text-sm text-destructive">{error ?? formError}</p>}

          <div className="flex flex-col gap-2">
            <Label htmlFor="meterType">Type</Label>
            <Select value={meterType ?? undefined} onValueChange={setMeterType}>
              <SelectTrigger id="meterType" className="w-full">
                <SelectValue placeholder="Select a type" />
              </SelectTrigger>
              <SelectContent>
                {METER_TYPES.map((type) => (
                  <SelectItem key={type} value={type} className="capitalize">
                    {type.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="serialNumber">Serial number</Label>
            <Input
              id="serialNumber"
              required
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="unitRate">Rate per unit (₦, optional)</Label>
            <Input id="unitRate" inputMode="decimal" placeholder="0.00" value={unitRate} onChange={(e) => setUnitRate(e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={submitting || !meterType || !serialNumber}>
              {submitting ? "Creating…" : "Create meter"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
