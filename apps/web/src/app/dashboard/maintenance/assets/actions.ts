"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { api } from "@/lib/api/server-client";
import { BackendError } from "@/lib/auth/backend";

export interface ActionResult {
  ok: boolean;
  message?: string;
}

export async function updateAssetStatusAction(assetId: string, status: string): Promise<ActionResult> {
  try {
    await api.patch(`/assets/${assetId}/status`, { status });
    revalidatePath(`/dashboard/maintenance/assets/${assetId}`);
    return { ok: true };
  } catch (error) {
    unstable_rethrow(error);
    return { ok: false, message: error instanceof BackendError ? error.message : "Unable to update asset status" };
  }
}
