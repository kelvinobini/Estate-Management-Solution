import { Badge } from "@/components/ui/badge";

const VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  open: "secondary",
  assigned: "secondary",
  in_progress: "default",
  on_hold: "destructive",
  closed: "outline",
  cancelled: "outline",
};

export function WorkOrderStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={VARIANTS[status] ?? "outline"} className="capitalize">
      {status.replace(/_/g, " ")}
    </Badge>
  );
}
