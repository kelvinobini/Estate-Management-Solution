import Link from "next/link";
import { api } from "@/lib/api/server-client";
import { fetchOrForbidden } from "@/lib/api/safe-fetch";
import { ForbiddenNotice } from "@/components/dashboard/forbidden-notice";
import { UnitStatusBadge } from "@/components/property/unit-status-badge";
import { formatNaira } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STATUSES = ["vacant", "occupied", "reserved", "under_maintenance"] as const;

interface Unit {
  id: string;
  unit_code: string;
  unit_type: string;
  status: string;
  base_rent_kobo: string;
}

export default async function UnitsListPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const status = STATUSES.includes(params.status as (typeof STATUSES)[number]) ? params.status! : "vacant";

  const { data: units, forbidden } = await fetchOrForbidden(() => api.get<Unit[]>(`/units?status=${status}`));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Units</h1>
        <p className="text-sm text-muted-foreground">Browse units across the portfolio by status.</p>
      </div>

      <StatusTabs current={status} />

      {forbidden ? (
        <ForbiddenNotice message="You don't have permission to view units." />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base capitalize">{status.replace(/_/g, " ")} units</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unit code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Base rent</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {units?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No units with this status.
                    </TableCell>
                  </TableRow>
                )}
                {units?.map((unit) => (
                  <TableRow key={unit.id}>
                    <TableCell>
                      <Link href={`/dashboard/units/${unit.id}`} className="font-medium text-primary hover:underline">
                        {unit.unit_code}
                      </Link>
                    </TableCell>
                    <TableCell className="capitalize">{unit.unit_type.replace(/_/g, " ")}</TableCell>
                    <TableCell className="text-right">{formatNaira(unit.base_rent_kobo)}</TableCell>
                    <TableCell>
                      <UnitStatusBadge status={unit.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatusTabs({ current }: { current: string }) {
  return (
    <div className="flex w-fit gap-1 rounded-lg border bg-muted/30 p-1">
      {STATUSES.map((status) => (
        <Link
          key={status}
          href={`/dashboard/units?status=${status}`}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors",
            status === current
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {status.replace(/_/g, " ")}
        </Link>
      ))}
    </div>
  );
}
