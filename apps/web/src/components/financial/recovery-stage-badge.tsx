import { Badge } from "@/components/ui/badge";

const VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  reminder: "secondary",
  notice: "default",
  legal_referral: "destructive",
};

export function RecoveryStageBadge({ stage }: { stage: string }) {
  return (
    <Badge variant={VARIANTS[stage] ?? "outline"} className="capitalize">
      {stage.replace(/_/g, " ")}
    </Badge>
  );
}
