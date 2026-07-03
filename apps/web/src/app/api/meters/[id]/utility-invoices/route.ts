import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/auth/proxy";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.text();
  return proxyToBackend(`/meters/${id}/utility-invoices`, { method: "POST", body });
}
