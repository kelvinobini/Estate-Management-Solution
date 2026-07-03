import { Badge } from "@/components/ui/badge";

const VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  open: "secondary",
  mediation: "default",
  legal: "destructive",
  resolved: "outline",
};

export function DisputeStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={VARIANTS[status] ?? "outline"} className="capitalize">
      {status}
    </Badge>
  );
}
