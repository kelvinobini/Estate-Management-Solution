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

const UNIT_TYPES = ["residential", "commercial", "serviced_apartment", "mixed_use"];

export function CreateUnitDialog({ floorId }: { floorId: string }) {
  const { open, setOpen, error, submitting, submit } = useCreateDialog(
    `/api/floors/${floorId}/units`,
    "Unit created",
  );

  const [unitCode, setUnitCode] = useState("");
  const [unitType, setUnitType] = useState<string | null>(null);
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [baseRent, setBaseRent] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    if (!unitType) return;

    let baseRentKobo: string | undefined;
    try {
      baseRentKobo = baseRent ? nairaInputToKobo(baseRent) : undefined;
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Enter a valid rent amount");
      return;
    }

    const ok = await submit({
      unitCode,
      unitType,
      bedrooms: bedrooms ? Number(bedrooms) : undefined,
      bathrooms: bathrooms ? Number(bathrooms) : undefined,
      baseRentKobo,
    });
    if (ok) {
      setUnitCode("");
      setUnitType(null);
      setBedrooms("");
      setBathrooms("");
      setBaseRent("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="size-4" />
        Add unit
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Add unit</DialogTitle>
          </DialogHeader>

          {(error || formError) && <p className="text-sm text-destructive">{error ?? formError}</p>}

          <div className="flex flex-col gap-2">
            <Label htmlFor="unitCode">Unit code</Label>
            <Input
              id="unitCode"
              placeholder="e.g. 3B"
              required
              value={unitCode}
              onChange={(e) => setUnitCode(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="unitType">Type</Label>
            <Select value={unitType ?? undefined} onValueChange={setUnitType}>
              <SelectTrigger id="unitType" className="w-full">
                <SelectValue placeholder="Select a type" />
              </SelectTrigger>
              <SelectContent>
                {UNIT_TYPES.map((type) => (
                  <SelectItem key={type} value={type} className="capitalize">
                    {type.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="bedrooms">Bedrooms</Label>
              <Input
                id="bedrooms"
                type="number"
                min={0}
                value={bedrooms}
                onChange={(e) => setBedrooms(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="bathrooms">Bathrooms</Label>
              <Input
                id="bathrooms"
                type="number"
                min={0}
                value={bathrooms}
                onChange={(e) => setBathrooms(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="baseRent">Base rent (₦ / year, optional)</Label>
            <Input
              id="baseRent"
              inputMode="decimal"
              placeholder="0.00"
              value={baseRent}
              onChange={(e) => setBaseRent(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={submitting || !unitType || !unitCode}>
              {submitting ? "Creating…" : "Create unit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
