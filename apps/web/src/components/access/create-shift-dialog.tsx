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

export function CreateShiftDialog({ guardId }: { guardId: string }) {
  const { open, setOpen, error, submitting, submit } = useCreateDialog(
    `/api/guards/${guardId}/shifts`,
    "Shift scheduled",
  );

  const [shiftStart, setShiftStart] = useState("");
  const [shiftEnd, setShiftEnd] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ok = await submit({
      shiftStart: new Date(shiftStart).toISOString(),
      shiftEnd: new Date(shiftEnd).toISOString(),
    });
    if (ok) {
      setShiftStart("");
      setShiftEnd("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="size-4" />
        Schedule shift
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Schedule shift</DialogTitle>
          </DialogHeader>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="shiftStart">Start</Label>
              <Input
                id="shiftStart"
                type="datetime-local"
                required
                value={shiftStart}
                onChange={(e) => setShiftStart(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="shiftEnd">End</Label>
              <Input
                id="shiftEnd"
                type="datetime-local"
                required
                value={shiftEnd}
                onChange={(e) => setShiftEnd(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={submitting || !shiftStart || !shiftEnd}>
              {submitting ? "Scheduling…" : "Schedule shift"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
