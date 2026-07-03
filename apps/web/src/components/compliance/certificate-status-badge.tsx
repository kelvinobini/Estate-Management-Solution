import { Badge } from "@/components/ui/badge";

const VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  valid: "default",
  expiring_soon: "secondary",
  expired: "destructive",
  no_expiry_date: "outline",
};

const LABELS: Record<string, string> = {
  valid: "Valid",
  expiring_soon: "Expiring soon",
  expired: "Expired",
  no_expiry_date: "No expiry date",
};

export function CertificateStatusBadge({ status }: { status: string }) {
  return <Badge variant={VARIANTS[status] ?? "outline"}>{LABELS[status] ?? status}</Badge>;
}
