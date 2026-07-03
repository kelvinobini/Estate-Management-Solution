"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { api } from "@/lib/api/server-client";
import { BackendError } from "@/lib/auth/backend";

export interface ActionResult {
  ok: boolean;
  message?: string;
}

export async function publishAnnouncementAction(announcementId: string): Promise<ActionResult> {
  try {
    await api.patch(`/announcements/${announcementId}/publish`);
    revalidatePath("/dashboard/community/announcements");
    return { ok: true };
  } catch (error) {
    unstable_rethrow(error);
    return { ok: false, message: error instanceof BackendError ? error.message : "Unable to publish announcement" };
  }
}

export async function updateComplaintStatusAction(complaintId: string, status: string): Promise<ActionResult> {
  try {
    await api.patch(`/complaints/${complaintId}/status`, { status });
    revalidatePath("/dashboard/community/complaints");
    return { ok: true };
  } catch (error) {
    unstable_rethrow(error);
    return { ok: false, message: error instanceof BackendError ? error.message : "Unable to update complaint status" };
  }
}

export async function cancelBookingAction(bookingId: string, amenityId: string): Promise<ActionResult> {
  try {
    await api.patch(`/bookings/${bookingId}/cancel`);
    revalidatePath(`/dashboard/community/amenities/${amenityId}`);
    return { ok: true };
  } catch (error) {
    unstable_rethrow(error);
    return { ok: false, message: error instanceof BackendError ? error.message : "Unable to cancel booking" };
  }
}
