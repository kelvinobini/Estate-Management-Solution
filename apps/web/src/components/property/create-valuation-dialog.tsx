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

const SOURCES = ["manual", "market_comparison", "automated"];

export function CreateValuationDialog({ propertyId }: { propertyId: string }) {
  const { open, setOpen, error, submitting, submit } = useCreateDialog(
    `/api/properties/${propertyId}/valuations`,
    "Valuation recorded",
  );
  const [valuation, setValuation] = useState("");
  const [valuationDate, setValuationDate] = useState("");
  const [valuerName, setValuerName] = useState("");
  const [source, setSource] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    let valuationKobo: string;
    try {
      valuationKobo = nairaInputToKobo(valuation);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Enter a valid amount");
      return;
    }

    const ok = await submit({
      valuationKobo,
      valuationDate,
      valuerName: valuerName || undefined,
      source: source || undefined,
    });
    if (ok) {
      setValuation("");
      setValuationDate("");
      setValuerName("");
      setSource(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="size-4" />
        Add valuation
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Record property valuation</DialogTitle>
          </DialogHeader>

          {(formError ?? error) && <p className="text-sm text-destructive">{formError ?? error}</p>}

          <div className="flex flex-col gap-2">
            <Label htmlFor="valuation">Valuation (₦)</Label>
            <Input
              id="valuation"
              inputMode="decimal"
              placeholder="0.00"
              required
              value={valuation}
              onChange={(e) => setValuation(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="valuationDate">Valuation date</Label>
            <Input
              id="valuationDate"
              type="date"
              required
              value={valuationDate}
              onChange={(e) => setValuationDate(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="valuerName">Valuer name (optional)</Label>
            <Input id="valuerName" value={valuerName} onChange={(e) => setValuerName(e.target.value)} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="source">Source (optional)</Label>
            <Select value={source ?? undefined} onValueChange={setSource}>
              <SelectTrigger id="source" className="w-full">
                <SelectValue placeholder="Select a source" />
              </SelectTrigger>
              <SelectContent>
                {SOURCES.map((item) => (
                  <SelectItem key={item} value={item} className="capitalize">
                    {item.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={submitting || !valuation || !valuationDate}>
              {submitting ? "Recording…" : "Record valuation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
