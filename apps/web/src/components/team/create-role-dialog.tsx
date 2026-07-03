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
import { PermissionChecklist } from "@/components/team/permission-checklist";
import { Plus } from "lucide-react";

interface Permission {
  id: string;
  code: string;
  module: string;
  description: string | null;
}

export function CreateRoleDialog({ permissions }: { permissions: Permission[] }) {
  const { open, setOpen, error, submitting, submit } = useCreateDialog("/api/roles", "Role created");
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(code: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ok = await submit({ name, permissionCodes: Array.from(selected) });
    if (ok) {
      setName("");
      setSelected(new Set());
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="size-4" />
        Create role
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Create custom role</DialogTitle>
          </DialogHeader>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex flex-col gap-2">
            <Label htmlFor="roleName">Role name</Label>
            <Input id="roleName" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Permissions</Label>
            <PermissionChecklist permissions={permissions} selected={selected} onToggle={toggle} />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={submitting || !name || selected.size === 0}>
              {submitting ? "Creating…" : "Create role"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
