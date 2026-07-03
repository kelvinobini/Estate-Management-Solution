import { NextRequest, NextResponse } from "next/server";
import { backendFetch, BackendError } from "@/lib/auth/backend";

/**
 * Public, unauthenticated proxy for the landing page's "Request access" form.
 * The organisation slug is injected server-side (this deployment's landing
 * page is branded for one specific estate) rather than trusted from the
 * browser — see LANDING_ORG_SLUG in .env.local.example.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  if (!body?.fullName || !body?.email) {
    return NextResponse.json({ message: "fullName and email are required" }, { status: 400 });
  }

  try {
    await backendFetch("/inquiries", {
      method: "POST",
      body: JSON.stringify({
        organisationSlug: process.env.LANDING_ORG_SLUG ?? "demo",
        fullName: body.fullName,
        email: body.email,
        phone: body.phone || undefined,
        message: body.message || undefined,
      }),
    });
    return NextResponse.json({ ok: true }, { status: 202 });
  } catch (error) {
    if (error instanceof BackendError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }
    return NextResponse.json({ message: "Unable to reach the server" }, { status: 502 });
  }
}
