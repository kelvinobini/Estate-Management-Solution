"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { updateUserStatusAction } from "@/app/dashboard/team/actions";

export function UserStatusActions({ userId, status }: { userId: string; status: string }) {
  const [isPending, startTransition] = useTransition();

  function handleChange(next: "active" | "suspended") {
    startTransition(async () => {
      const result = await updateUserStatusAction(userId, next);
      if (result.ok) {
        toast.success(`User marked ${next}`);
      } else {
        toast.error(result.message ?? "Unable to update user status");
      }
    });
  }

  if (status === "suspended") {
    return (
      <Button size="sm" variant="outline" disabled={isPending} onClick={() => handleChange("active")}>
        Reactivate
      </Button>
    );
  }

  return (
    <Button size="sm" variant="destructive" disabled={isPending} onClick={() => handleChange("suspended")}>
      Suspend
    </Button>
  );
}
