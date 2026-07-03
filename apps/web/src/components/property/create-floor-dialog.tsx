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

export function CreateFloorDialog({ blockId }: { blockId: string }) {
  const { open, setOpen, error, submitting, submit } = useCreateDialog(
    `/api/blocks/${blockId}/floors`,
    "Floor created",
  );
  const [levelNumber, setLevelNumber] = useState("");
  const [label, setLabel] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const level = Number(levelNumber);
    if (!Number.isInteger(level)) return;

    const ok = await submit({ levelNumber: level, label: label || undefined });
    if (ok) {
      setLevelNumber("");
      setLabel("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="size-4" />
        Add floor
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Add floor</DialogTitle>
          </DialogHeader>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex flex-col gap-2">
            <Label htmlFor="levelNumber">Level number</Label>
            <Input
              id="levelNumber"
              type="number"
              placeholder="e.g. 3, or -1 for a basement"
              required
              value={levelNumber}
              onChange={(e) => setLevelNumber(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="label">Label (optional)</Label>
            <Input id="label" placeholder="e.g. Ground floor" value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={submitting || levelNumber === ""}>
              {submitting ? "Creating…" : "Create floor"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
