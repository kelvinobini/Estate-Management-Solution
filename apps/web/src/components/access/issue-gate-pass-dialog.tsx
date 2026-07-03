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

export function IssueGatePassDialog({ visitorId }: { visitorId: string }) {
  const { open, setOpen, error, submitting, submit } = useCreateDialog(
    `/api/visitors/${visitorId}/gate-passes`,
    "Gate pass issued",
  );

  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ok = await submit({
      validFrom: new Date(validFrom).toISOString(),
      validUntil: new Date(validUntil).toISOString(),
    });
    if (ok) {
      setValidFrom("");
      setValidUntil("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="size-4" />
        Issue gate pass
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Issue gate pass</DialogTitle>
          </DialogHeader>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex flex-col gap-2">
            <Label htmlFor="validFrom">Valid from</Label>
            <Input
              id="validFrom"
              type="datetime-local"
              required
              value={validFrom}
              onChange={(e) => setValidFrom(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="validUntil">Valid until</Label>
            <Input
              id="validUntil"
              type="datetime-local"
              required
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={submitting || !validFrom || !validUntil}>
              {submitting ? "Issuing…" : "Issue pass"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
