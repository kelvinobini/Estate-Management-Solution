import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/auth/proxy";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToBackend(`/tenants/${id}/portal-access`, { method: "POST" });
}
