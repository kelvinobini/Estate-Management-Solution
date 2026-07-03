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

const DOCUMENT_TYPES = [
  "lease",
  "id_document",
  "fire_safety_cert",
  "elevator_inspection_cert",
  "electrical_certification",
  "epc_rating",
  "gas_safety_certificate",
  "insurance_certificate",
  "certificate_of_occupancy",
  "governors_consent",
  "other",
];
const ACCESS_LEVELS = ["public", "restricted", "confidential"];

interface CreateDocumentDialogProps {
  propertyId?: string;
  tenantId?: string;
  leaseId?: string;
}

export function CreateDocumentDialog({ propertyId, tenantId, leaseId }: CreateDocumentDialogProps) {
  const { open, setOpen, error, submitting, submit } = useCreateDialog("/api/documents", "Document added");

  const [title, setTitle] = useState("");
  const [documentType, setDocumentType] = useState<string | null>(null);
  const [accessLevel, setAccessLevel] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState("");
  const [expiryDate, setExpiryDate] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!documentType) return;

    const ok = await submit({
      propertyId,
      tenantId,
      leaseId,
      title,
      documentType,
      accessLevel: accessLevel ?? undefined,
      fileUrl,
      expiryDate: expiryDate || undefined,
    });
    if (ok) {
      setTitle("");
      setDocumentType(null);
      setAccessLevel(null);
      setFileUrl("");
      setExpiryDate("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="size-4" />
        Add document
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Add document</DialogTitle>
          </DialogHeader>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex flex-col gap-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="documentType">Type</Label>
              <Select value={documentType ?? undefined} onValueChange={setDocumentType}>
                <SelectTrigger id="documentType" className="w-full">
                  <SelectValue placeholder="Select a type" />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type} className="capitalize">
                      {type.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="accessLevel">Access level</Label>
              <Select value={accessLevel ?? undefined} onValueChange={setAccessLevel}>
                <SelectTrigger id="accessLevel" className="w-full">
                  <SelectValue placeholder="Restricted (default)" />
                </SelectTrigger>
                <SelectContent>
                  {ACCESS_LEVELS.map((level) => (
                    <SelectItem key={level} value={level} className="capitalize">
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="fileUrl">File URL</Label>
            <Input
              id="fileUrl"
              required
              placeholder="https://…"
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="expiryDate">Expiry date (optional)</Label>
            <Input
              id="expiryDate"
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={submitting || !documentType || !title || !fileUrl}>
              {submitting ? "Adding…" : "Add document"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
