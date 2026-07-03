"use client";

import { useState, type FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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

interface LandlordUser {
  id: string;
  full_name: string;
}

export function AssignPropertyOwnerDialog({ propertyId, landlords }: { propertyId: string; landlords: LandlordUser[] }) {
  const { open, setOpen, error, submitting, submit } = useCreateDialog(
    `/api/properties/${propertyId}/owners`,
    "Owner assigned",
  );
  const [userId, setUserId] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId) return;

    const ok = await submit({ userId });
    if (ok) setUserId(null);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="size-4" />
        Assign owner
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Assign owner</DialogTitle>
            <DialogDescription>
              Links a landlord portal login to this property, so they can see it (and only it) in their own view.
            </DialogDescription>
          </DialogHeader>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {landlords.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No Landlord-role accounts yet — invite one from the Team page first.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              <Label htmlFor="userId">Landlord</Label>
              <Select value={userId ?? undefined} onValueChange={setUserId}>
                <SelectTrigger id="userId" className="w-full">
                  <SelectValue placeholder="Select a landlord account" />
                </SelectTrigger>
                <SelectContent>
                  {landlords.map((person) => (
                    <SelectItem key={person.id} value={person.id}>
                      {person.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter>
            <Button type="submit" disabled={submitting || !userId}>
              {submitting ? "Assigning…" : "Assign owner"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
