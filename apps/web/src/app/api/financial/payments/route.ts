import { NextRequest, NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/auth/proxy";

/**
 * Narrow BFF proxy for recording a manual payment. A client component needs
 * this (rather than a Server Action) so it can show inline/toast feedback
 * without a full page navigation — but the access token still never leaves
 * the server, since this route reads it from the httpOnly cookie itself.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.invoiceId || !body?.amountKobo || !body?.paymentMethod) {
    return NextResponse.json({ message: "invoiceId, amountKobo and paymentMethod are required" }, { status: 400 });
  }

  return proxyToBackend("/payments/manual", { method: "POST", body: JSON.stringify(body) });
}
