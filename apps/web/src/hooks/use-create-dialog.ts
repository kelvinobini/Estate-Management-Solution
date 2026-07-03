"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

/** Shared open/submit/error state for the create-entity dialogs (property, block, floor, unit, ...). */
export function useCreateDialog(path: string, successMessage: string) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(payload: unknown): Promise<boolean> {
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.message ?? "Request failed");
        return false;
      }

      toast.success(successMessage);
      setOpen(false);
      router.refresh();
      return true;
    } catch {
      setError("Unable to reach the server. Please try again.");
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  return { open, setOpen, error, submitting, submit };
}
