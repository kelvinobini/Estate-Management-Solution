import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Pagination({
  basePath,
  page,
  totalPages,
  status,
}: {
  basePath: string;
  page: number;
  totalPages: number;
  status?: string;
}) {
  function hrefFor(targetPage: number) {
    const query = new URLSearchParams();
    if (status) query.set("status", status);
    query.set("page", String(targetPage));
    return `${basePath}?${query.toString()}`;
  }

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Button variant="outline" size="sm" render={<Link href={hrefFor(page - 1)} />}>
            Previous
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Previous
          </Button>
        )}
        {page < totalPages ? (
          <Button variant="outline" size="sm" render={<Link href={hrefFor(page + 1)} />}>
            Next
          </Button>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Next
          </Button>
        )}
      </div>
    </div>
  );
}
