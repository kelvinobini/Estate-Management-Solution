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

export function CreatePatrolLogDialog({ shiftId }: { shiftId: string }) {
  const { open, setOpen, error, submitting, submit } = useCreateDialog(
    `/api/guards/shifts/${shiftId}/patrol-logs`,
    "Patrol logged",
  );

  const [checkpointName, setCheckpointName] = useState("");
  const [notes, setNotes] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ok = await submit({ checkpointName, notes: notes || undefined });
    if (ok) {
      setCheckpointName("");
      setNotes("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="size-4" />
        Log checkpoint
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Log checkpoint</DialogTitle>
          </DialogHeader>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex flex-col gap-2">
            <Label htmlFor="checkpointName">Checkpoint</Label>
            <Input
              id="checkpointName"
              required
              placeholder="e.g. Main gate, Block A lobby"
              value={checkpointName}
              onChange={(e) => setCheckpointName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={submitting || !checkpointName}>
              {submitting ? "Logging…" : "Log checkpoint"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
