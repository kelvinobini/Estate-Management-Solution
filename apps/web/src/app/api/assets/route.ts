import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/auth/proxy";

export async function POST(request: NextRequest) {
  const body = await request.text();
  return proxyToBackend("/assets", { method: "POST", body });
}
