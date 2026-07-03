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
import { nairaInputToKobo } from "@/lib/format";
import { Plus } from "lucide-react";

export function CreateInventoryItemDialog() {
  const { open, setOpen, error, submitting, submit } = useCreateDialog("/api/inventory-items", "Item added");

  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [reorderLevel, setReorderLevel] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    let unitCostKobo: string | undefined;
    try {
      unitCostKobo = unitCost ? nairaInputToKobo(unitCost) : undefined;
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Enter a valid cost");
      return;
    }

    const ok = await submit({
      name,
      sku: sku || undefined,
      reorderLevel: reorderLevel ? Number(reorderLevel) : undefined,
      unitCostKobo,
    });
    if (ok) {
      setName("");
      setSku("");
      setReorderLevel("");
      setUnitCost("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="size-4" />
        Add item
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Add inventory item</DialogTitle>
          </DialogHeader>

          {(error || formError) && <p className="text-sm text-destructive">{error ?? formError}</p>}

          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="sku">SKU (optional)</Label>
              <Input id="sku" value={sku} onChange={(e) => setSku(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="reorderLevel">Reorder level</Label>
              <Input
                id="reorderLevel"
                type="number"
                min={0}
                value={reorderLevel}
                onChange={(e) => setReorderLevel(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="unitCost">Unit cost (₦, optional)</Label>
            <Input id="unitCost" inputMode="decimal" placeholder="0.00" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={submitting || !name}>
              {submitting ? "Adding…" : "Add item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
