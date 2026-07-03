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

export function CreateAssetDialog({ propertyId }: { propertyId: string }) {
  const { open, setOpen, error, submitting, submit } = useCreateDialog("/api/assets", "Asset registered");

  const [name, setName] = useState("");
  const [assetType, setAssetType] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [warrantyExpiry, setWarrantyExpiry] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ok = await submit({
      propertyId,
      name,
      assetType,
      serialNumber: serialNumber || undefined,
      warrantyExpiry: warrantyExpiry || undefined,
    });
    if (ok) {
      setName("");
      setAssetType("");
      setSerialNumber("");
      setWarrantyExpiry("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="size-4" />
        Register asset
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Register asset</DialogTitle>
          </DialogHeader>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="assetType">Type</Label>
            <Input
              id="assetType"
              required
              placeholder="e.g. elevator, generator, hvac_unit, fire_panel"
              value={assetType}
              onChange={(e) => setAssetType(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="serialNumber">Serial number (optional)</Label>
              <Input id="serialNumber" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="warrantyExpiry">Warranty expiry (optional)</Label>
              <Input
                id="warrantyExpiry"
                type="date"
                value={warrantyExpiry}
                onChange={(e) => setWarrantyExpiry(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={submitting || !name || !assetType}>
              {submitting ? "Registering…" : "Register asset"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
