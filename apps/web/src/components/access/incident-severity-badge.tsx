import { Badge } from "@/components/ui/badge";

const VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  low: "outline",
  medium: "secondary",
  high: "default",
  critical: "destructive",
};

export function IncidentSeverityBadge({ severity }: { severity: string }) {
  return (
    <Badge variant={VARIANTS[severity] ?? "outline"} className="capitalize">
      {severity}
    </Badge>
  );
}
