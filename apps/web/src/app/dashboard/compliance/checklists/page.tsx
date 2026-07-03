import Link from "next/link";
import { api } from "@/lib/api/server-client";
import { fetchOrForbidden } from "@/lib/api/safe-fetch";
import { ForbiddenNotice } from "@/components/dashboard/forbidden-notice";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ChecklistItem {
  code: string;
  title: string;
  description: string;
  evidenceDocumentTypes?: string[];
}

interface JurisdictionChecklist {
  jurisdiction: string;
  title: string;
  items: ChecklistItem[];
}

export default async function ComplianceChecklistsPage({
  searchParams,
}: {
  searchParams: Promise<{ jurisdiction?: string }>;
}) {
  const params = await searchParams;

  const { data: jurisdictions, forbidden } = await fetchOrForbidden(() =>
    api.get<string[]>("/compliance/checklists"),
  );

  if (forbidden) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold tracking-tight">Compliance checklists</h1>
        <ForbiddenNotice message="You don't have permission to view compliance checklists." />
      </div>
    );
  }

  const jurisdiction =
    params.jurisdiction && jurisdictions?.includes(params.jurisdiction)
      ? params.jurisdiction
      : (jurisdictions?.[0] ?? "NG-LAGOS");

  const checklist = await api.get<JurisdictionChecklist>(`/compliance/checklists/${jurisdiction}`);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Compliance checklists</h1>
        <p className="text-sm text-muted-foreground">
          Reference requirements by jurisdiction. This shows what&apos;s required, not completion status.
        </p>
      </div>

      <div className="flex w-fit flex-wrap gap-1 rounded-lg border bg-muted/30 p-1">
        {jurisdictions?.map((j) => (
          <Link
            key={j}
            href={`/dashboard/compliance/checklists?jurisdiction=${j}`}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              j === jurisdiction
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {j}
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{checklist.title}</CardTitle>
          <CardDescription>{checklist.items.length} requirements</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {checklist.items.map((item) => (
            <div key={item.code} className="rounded-lg border p-4">
              <p className="font-medium">{item.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
              {item.evidenceDocumentTypes && item.evidenceDocumentTypes.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {item.evidenceDocumentTypes.map((type) => (
                    <Badge key={type} variant="outline" className="capitalize">
                      {type.replace(/_/g, " ")}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
