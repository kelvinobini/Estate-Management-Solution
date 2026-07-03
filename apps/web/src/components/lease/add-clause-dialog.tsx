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

export function AddClauseDialog({ leaseId }: { leaseId: string }) {
  const { open, setOpen, error, submitting, submit } = useCreateDialog(
    `/api/leases/${leaseId}/clauses`,
    "Clause added",
  );
  const [clauseType, setClauseType] = useState("");
  const [clauseText, setClauseText] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ok = await submit({ clauseType, clauseText });
    if (ok) {
      setClauseType("");
      setClauseText("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="size-4" />
        Add clause
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Add lease clause</DialogTitle>
          </DialogHeader>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex flex-col gap-2">
            <Label htmlFor="clauseType">Clause type</Label>
            <Input
              id="clauseType"
              placeholder="e.g. pet_policy, parking, subletting"
              required
              value={clauseType}
              onChange={(e) => setClauseType(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="clauseText">Clause text</Label>
            <Input
              id="clauseText"
              required
              value={clauseText}
              onChange={(e) => setClauseText(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={submitting || !clauseType || !clauseText}>
              {submitting ? "Adding…" : "Add clause"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
