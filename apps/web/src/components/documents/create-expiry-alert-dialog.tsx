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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateDialog } from "@/hooks/use-create-dialog";
import { Plus } from "lucide-react";

const CHANNELS = ["email", "sms", "push", "in_app"];

export function CreateExpiryAlertDialog({ documentId }: { documentId: string }) {
  const { open, setOpen, error, submitting, submit } = useCreateDialog(
    `/api/documents/${documentId}/expiry-alerts`,
    "Expiry alert scheduled",
  );

  const [alertDate, setAlertDate] = useState("");
  const [channel, setChannel] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ok = await submit({ alertDate, channel: channel ?? undefined });
    if (ok) {
      setAlertDate("");
      setChannel(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="size-4" />
        Schedule alert
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Schedule expiry alert</DialogTitle>
          </DialogHeader>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex flex-col gap-2">
            <Label htmlFor="alertDate">Alert date</Label>
            <Input
              id="alertDate"
              type="date"
              required
              value={alertDate}
              onChange={(e) => setAlertDate(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="channel">Channel</Label>
            <Select value={channel ?? undefined} onValueChange={setChannel}>
              <SelectTrigger id="channel" className="w-full">
                <SelectValue placeholder="In-app (default)" />
              </SelectTrigger>
              <SelectContent>
                {CHANNELS.map((c) => (
                  <SelectItem key={c} value={c} className="capitalize">
                    {c.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={submitting || !alertDate}>
              {submitting ? "Scheduling…" : "Schedule alert"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
