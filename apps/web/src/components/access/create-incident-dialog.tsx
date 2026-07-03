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

const SEVERITIES = ["low", "medium", "high", "critical"];
const INCIDENT_TYPES = ["security_breach", "theft", "fire", "altercation", "medical", "other"];

interface Property {
  id: string;
  name: string;
}

export function CreateIncidentDialog({ properties }: { properties: Property[] }) {
  const { open, setOpen, error, submitting, submit } = useCreateDialog("/api/incidents", "Incident logged");

  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [incidentType, setIncidentType] = useState<string | null>(null);
  const [severity, setSeverity] = useState<string | null>(null);
  const [description, setDescription] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!propertyId || !incidentType) return;

    const ok = await submit({
      propertyId,
      incidentType,
      severity: severity ?? undefined,
      description,
    });
    if (ok) {
      setPropertyId(null);
      setIncidentType(null);
      setSeverity(null);
      setDescription("");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="size-4" />
        Log incident
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Log incident</DialogTitle>
          </DialogHeader>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex flex-col gap-2">
            <Label htmlFor="propertyId">Property</Label>
            <Select value={propertyId ?? undefined} onValueChange={setPropertyId}>
              <SelectTrigger id="propertyId" className="w-full">
                <SelectValue placeholder="Select a property" />
              </SelectTrigger>
              <SelectContent>
                {properties.map((property) => (
                  <SelectItem key={property.id} value={property.id}>
                    {property.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="incidentType">Type</Label>
              <Select value={incidentType ?? undefined} onValueChange={setIncidentType}>
                <SelectTrigger id="incidentType" className="w-full">
                  <SelectValue placeholder="Select a type" />
                </SelectTrigger>
                <SelectContent>
                  {INCIDENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type} className="capitalize">
                      {type.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="severity">Severity</Label>
              <Select value={severity ?? undefined} onValueChange={setSeverity}>
                <SelectTrigger id="severity" className="w-full">
                  <SelectValue placeholder="Low (default)" />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITIES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" required value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={submitting || !propertyId || !incidentType || !description}>
              {submitting ? "Logging…" : "Log incident"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
