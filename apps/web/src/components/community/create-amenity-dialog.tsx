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

export function CreateAmenityDialog({ propertyId }: { propertyId: string }) {
  const { open, setOpen, error, submitting, submit } = useCreateDialog("/api/amenities", "Amenity created");

  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState("");
  const [bookingFee, setBookingFee] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    let bookingFeeKobo: string | undefined;
    try {
      bookingFeeKobo = bookingFee ? nairaInputToKobo(bookingFee) : undefined;
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Enter a valid fee");
      return;
    }

    const ok = await submit({
      propertyId,
      name,
      capacity: capacity ? Number(capacity) : undefined,
      bookingFeeKobo,
    });
    if (ok) {
      setName("");
      setCapacity("");
      setBookingFee("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="size-4" />
        Add amenity
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Add amenity</DialogTitle>
          </DialogHeader>

          {(error || formError) && <p className="text-sm text-destructive">{error ?? formError}</p>}

          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" required placeholder="e.g. Gym, Pool, Event hall" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="capacity">Capacity (optional)</Label>
              <Input id="capacity" type="number" min={1} value={capacity} onChange={(e) => setCapacity(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="bookingFee">Booking fee (₦, optional)</Label>
              <Input id="bookingFee" inputMode="decimal" placeholder="0.00" value={bookingFee} onChange={(e) => setBookingFee(e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={submitting || !name}>
              {submitting ? "Creating…" : "Create amenity"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
