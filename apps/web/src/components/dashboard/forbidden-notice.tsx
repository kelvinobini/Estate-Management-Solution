import { Card, CardContent } from "@/components/ui/card";

export function ForbiddenNotice({ message }: { message?: string }) {
  return (
    <Card>
      <CardContent className="py-6 text-sm text-muted-foreground">
        {message ?? "You don't have permission to view this."}
      </CardContent>
    </Card>
  );
}
