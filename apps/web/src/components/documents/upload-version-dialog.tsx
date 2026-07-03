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

export function UploadVersionDialog({ documentId }: { documentId: string }) {
  const { open, setOpen, error, submitting, submit } = useCreateDialog(
    `/api/documents/${documentId}/versions`,
    "New version uploaded",
  );
  const [fileUrl, setFileUrl] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ok = await submit({ fileUrl });
    if (ok) setFileUrl("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="size-4" />
        Upload new version
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Upload new version</DialogTitle>
          </DialogHeader>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex flex-col gap-2">
            <Label htmlFor="fileUrl">File URL</Label>
            <Input id="fileUrl" required placeholder="https://…" value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={submitting || !fileUrl}>
              {submitting ? "Uploading…" : "Upload version"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
