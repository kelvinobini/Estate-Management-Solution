import { Badge } from "@/components/ui/badge";

const VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  low: "outline",
  medium: "secondary",
  high: "default",
  emergency: "destructive",
};

export function PriorityBadge({ priority }: { priority: string }) {
  return (
    <Badge variant={VARIANTS[priority] ?? "outline"} className="capitalize">
      {priority}
    </Badge>
  );
}
