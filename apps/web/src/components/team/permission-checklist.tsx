"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface Permission {
  id: string;
  code: string;
  module: string;
  description: string | null;
}

export function PermissionChecklist({
  permissions,
  selected,
  onToggle,
}: {
  permissions: Permission[];
  selected: Set<string>;
  onToggle: (code: string) => void;
}) {
  const byModule = new Map<string, Permission[]>();
  for (const permission of permissions) {
    const list = byModule.get(permission.module) ?? [];
    list.push(permission);
    byModule.set(permission.module, list);
  }

  return (
    <div className="flex max-h-80 flex-col gap-4 overflow-y-auto rounded-lg border border-border p-3">
      {Array.from(byModule.entries()).map(([module, items]) => (
        <div key={module} className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase text-muted-foreground">{module.replace(/_/g, " ")}</p>
          {items.map((permission) => (
            <div key={permission.id} className="flex items-start gap-2">
              <Checkbox
                id={`perm-${permission.code}`}
                checked={selected.has(permission.code)}
                onCheckedChange={() => onToggle(permission.code)}
                className="mt-0.5"
              />
              <Label htmlFor={`perm-${permission.code}`} className="flex flex-col items-start gap-0.5 font-normal">
                <span className="text-sm">{permission.code}</span>
                {permission.description && (
                  <span className="text-xs text-muted-foreground">{permission.description}</span>
                )}
              </Label>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
