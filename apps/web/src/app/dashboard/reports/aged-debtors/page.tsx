import Link from "next/link";
import { api } from "@/lib/api/server-client";
import { fetchOrForbidden } from "@/lib/api/safe-fetch";
import { ForbiddenNotice } from "@/components/dashboard/forbidden-notice";
import { formatNaira } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";

interface AgedDebtorRow {
  recovery_stage: string;
  total_outstanding_kobo: string;
  count: number;
}

const STAGE_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  reminder: "secondary",
  notice: "default",
  legal_referral: "destructive",
};

export default async function AgedDebtorsPage() {
  const { data: rows, forbidden } = await fetchOrForbidden(() => api.get<AgedDebtorRow[]>("/reports/aged-debtors"));

  const totalOutstanding = rows?.reduce((sum, row) => sum + BigInt(row.total_outstanding_kobo), 0n) ?? 0n;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/dashboard/reports"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to reports
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Aged debtors</h1>
        <p className="text-sm text-muted-foreground">
          {forbidden ? "" : `Total outstanding: ${formatNaira(totalOutstanding)}`}
        </p>
      </div>

      {forbidden ? (
        <ForbiddenNotice message="You don't have permission to view aged debtors." />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Outstanding arrears by recovery stage</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recovery stage</TableHead>
                  <TableHead className="text-right">Accounts</TableHead>
                  <TableHead className="text-right">Outstanding</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No outstanding arrears.
                    </TableCell>
                  </TableRow>
                )}
                {rows?.map((row) => (
                  <TableRow key={row.recovery_stage}>
                    <TableCell>
                      <Badge variant={STAGE_VARIANTS[row.recovery_stage] ?? "outline"} className="capitalize">
                        {row.recovery_stage.replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{row.count}</TableCell>
                    <TableCell className="text-right">{formatNaira(row.total_outstanding_kobo)}</TableCell>
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
