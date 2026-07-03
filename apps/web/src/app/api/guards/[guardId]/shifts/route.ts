import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/auth/proxy";

export async function POST(request: NextRequest, { params }: { params: Promise<{ guardId: string }> }) {
  const { guardId } = await params;
  const body = await request.text();
  return proxyToBackend(`/guards/${guardId}/shifts`, { method: "POST", body });
}
