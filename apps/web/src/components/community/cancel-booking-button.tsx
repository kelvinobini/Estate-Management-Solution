"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cancelBookingAction } from "@/app/dashboard/community/actions";

export function CancelBookingButton({ bookingId, amenityId }: { bookingId: string; amenityId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleCancel() {
    startTransition(async () => {
      const result = await cancelBookingAction(bookingId, amenityId);
      if (result.ok) {
        toast.success("Booking cancelled");
      } else {
        toast.error(result.message ?? "Unable to cancel booking");
      }
    });
  }

  return (
    <Button size="sm" variant="destructive" disabled={isPending} onClick={handleCancel}>
      Cancel
    </Button>
  );
}
