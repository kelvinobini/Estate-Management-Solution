"use client";

import { useState, useTransition, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { restockInventoryAction } from "@/app/dashboard/maintenance/inventory/actions";

export function RestockDialog({ itemId }: { itemId: string }) {
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = await restockInventoryAction(itemId, Number(quantity));
      if (result.ok) {
        toast.success("Item restocked");
        setOpen(false);
        setQuantity("");
      } else {
        toast.error(result.message ?? "Unable to restock item");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>Restock</DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Restock item</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="quantity">Quantity to add</Label>
            <Input
              id="quantity"
              type="number"
              min={1}
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isPending || !quantity}>
              Restock
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
