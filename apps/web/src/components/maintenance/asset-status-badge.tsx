import { Badge } from "@/components/ui/badge";

const VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  operational: "default",
  faulty: "destructive",
  decommissioned: "outline",
};

export function AssetStatusBadge({ status }: { status: string }) {
  return (
    <Badge variant={VARIANTS[status] ?? "outline"} className="capitalize">
      {status}
    </Badge>
  );
}
