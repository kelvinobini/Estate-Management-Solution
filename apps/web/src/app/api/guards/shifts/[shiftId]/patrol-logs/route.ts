import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/auth/proxy";

export async function POST(request: NextRequest, { params }: { params: Promise<{ shiftId: string }> }) {
  const { shiftId } = await params;
  const body = await request.text();
  return proxyToBackend(`/guards/shifts/${shiftId}/patrol-logs`, { method: "POST", body });
}
