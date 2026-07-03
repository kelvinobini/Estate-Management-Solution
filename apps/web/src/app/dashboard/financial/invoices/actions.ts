"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { api } from "@/lib/api/server-client";
import { BackendError } from "@/lib/auth/backend";

export interface ActionResult {
  ok: boolean;
  message?: string;
}

export async function issueInvoiceAction(invoiceId: string): Promise<ActionResult> {
  try {
    await api.patch(`/invoices/${invoiceId}/issue`);
    revalidatePath(`/dashboard/financial/invoices/${invoiceId}`);
    revalidatePath("/dashboard/financial/invoices");
    return { ok: true };
  } catch (error) {
    // apiFetch redirects to /login on a 401 by throwing Next's internal
    // redirect signal — that must propagate, not be swallowed as a failure.
    unstable_rethrow(error);
    return { ok: false, message: error instanceof BackendError ? error.message : "Unable to issue invoice" };
  }
}

export async function voidInvoiceAction(invoiceId: string): Promise<ActionResult> {
  try {
    await api.patch(`/invoices/${invoiceId}/void`);
    revalidatePath(`/dashboard/financial/invoices/${invoiceId}`);
    revalidatePath("/dashboard/financial/invoices");
    return { ok: true };
  } catch (error) {
    unstable_rethrow(error);
    return { ok: false, message: error instanceof BackendError ? error.message : "Unable to void invoice" };
  }
}
