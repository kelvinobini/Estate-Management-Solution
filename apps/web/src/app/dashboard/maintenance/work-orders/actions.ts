"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { api } from "@/lib/api/server-client";
import { BackendError } from "@/lib/auth/backend";

export interface ActionResult {
  ok: boolean;
  message?: string;
}

function revalidateWorkOrder(workOrderId: string) {
  revalidatePath(`/dashboard/maintenance/work-orders/${workOrderId}`);
  revalidatePath("/dashboard/maintenance/work-orders");
}

async function run(workOrderId: string, work: () => Promise<unknown>, failureMessage: string): Promise<ActionResult> {
  try {
    await work();
    revalidateWorkOrder(workOrderId);
    return { ok: true };
  } catch (error) {
    unstable_rethrow(error);
    return { ok: false, message: error instanceof BackendError ? error.message : failureMessage };
  }
}

export async function assignWorkOrderAction(
  workOrderId: string,
  assignee: { vendorId: string } | { userId: string },
): Promise<ActionResult> {
  return run(workOrderId, () => api.patch(`/work-orders/${workOrderId}/assign`, assignee), "Unable to assign work order");
}

export async function updateWorkOrderStatusAction(workOrderId: string, status: string): Promise<ActionResult> {
  return run(
    workOrderId,
    () => api.patch(`/work-orders/${workOrderId}/status`, { status }),
    "Unable to update work order status",
  );
}
