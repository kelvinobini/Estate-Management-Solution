"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { api } from "@/lib/api/server-client";
import { BackendError } from "@/lib/auth/backend";

export interface ActionResult {
  ok: boolean;
  message?: string;
}

function revalidateLease(leaseId: string) {
  revalidatePath(`/dashboard/leases/${leaseId}`);
  revalidatePath("/dashboard/leases");
}

async function runLeaseAction(leaseId: string, work: () => Promise<unknown>, failureMessage: string): Promise<ActionResult> {
  try {
    await work();
    revalidateLease(leaseId);
    return { ok: true };
  } catch (error) {
    unstable_rethrow(error);
    return { ok: false, message: error instanceof BackendError ? error.message : failureMessage };
  }
}

export async function submitForSignatureAction(leaseId: string): Promise<ActionResult> {
  return runLeaseAction(
    leaseId,
    () => api.patch(`/leases/${leaseId}/submit-for-signature`),
    "Unable to submit lease for signature",
  );
}

export async function activateLeaseAction(leaseId: string): Promise<ActionResult> {
  return runLeaseAction(leaseId, () => api.patch(`/leases/${leaseId}/activate`, {}), "Unable to activate lease");
}

export async function renewLeaseAction(leaseId: string, newEndDate: string): Promise<ActionResult> {
  return runLeaseAction(
    leaseId,
    () => api.patch(`/leases/${leaseId}/renew`, { newEndDate }),
    "Unable to renew lease",
  );
}

export async function terminateLeaseAction(leaseId: string, reason: string): Promise<ActionResult> {
  return runLeaseAction(
    leaseId,
    () => api.patch(`/leases/${leaseId}/terminate`, { reason }),
    "Unable to terminate lease",
  );
}

export async function updateDisputeStatusAction(
  leaseId: string,
  disputeId: string,
  status: string,
  resolutionNotes?: string,
): Promise<ActionResult> {
  return runLeaseAction(
    leaseId,
    () => api.patch(`/disputes/${disputeId}/status`, { status, resolutionNotes }),
    "Unable to update dispute status",
  );
}
