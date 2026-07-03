import { Badge } from "@/components/ui/badge";

const VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  public: "outline",
  restricted: "secondary",
  confidential: "destructive",
};

export function AccessLevelBadge({ accessLevel }: { accessLevel: string }) {
  return (
    <Badge variant={VARIANTS[accessLevel] ?? "outline"} className="capitalize">
      {accessLevel}
    </Badge>
  );
}
