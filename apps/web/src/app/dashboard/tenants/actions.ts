"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { api } from "@/lib/api/server-client";
import { BackendError } from "@/lib/auth/backend";

export interface ActionResult {
  ok: boolean;
  message?: string;
}

export async function recordKycDecisionAction(
  tenantId: string,
  outcome: "verified" | "rejected",
  provider: string,
): Promise<ActionResult> {
  try {
    await api.patch(`/tenants/${tenantId}/kyc`, { outcome, provider });
    revalidatePath(`/dashboard/tenants/${tenantId}`);
    revalidatePath("/dashboard/tenants");
    return { ok: true };
  } catch (error) {
    unstable_rethrow(error);
    return { ok: false, message: error instanceof BackendError ? error.message : "Unable to record KYC decision" };
  }
}

export async function eraseTenantDataAction(tenantId: string): Promise<ActionResult> {
  try {
    await api.post(`/compliance/data-subjects/tenants/${tenantId}/erase`);
    revalidatePath(`/dashboard/tenants/${tenantId}`);
    revalidatePath("/dashboard/tenants");
    return { ok: true };
  } catch (error) {
    unstable_rethrow(error);
    return { ok: false, message: error instanceof BackendError ? error.message : "Unable to erase tenant data" };
  }
}
