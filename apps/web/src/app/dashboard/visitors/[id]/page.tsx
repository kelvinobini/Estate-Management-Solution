import Link from "next/link";
import { notFound } from "next/navigation";
import { api } from "@/lib/api/server-client";
import { BackendError } from "@/lib/auth/backend";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { GatePassStatusBadge } from "@/components/access/gate-pass-status-badge";
import { IssueGatePassDialog } from "@/components/access/issue-gate-pass-dialog";
import { VisitorBlacklistActions } from "@/components/access/visitor-blacklist-actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";

interface Visitor {
  id: string;
  full_name: string;
  phone: string | null;
  is_blacklisted: boolean;
  blacklist_reason: string | null;
  host_tenant_id: string | null;
}

interface GatePass {
  id: string;
  otp_code: string;
  status: string;
  valid_from: string;
  valid_until: string;
}

export default async function VisitorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let visitor: Visitor;
  try {
    visitor = await api.get<Visitor>(`/visitors/${id}`);
  } catch (error) {
    if (error instanceof BackendError && error.status === 404) notFound();
    throw error;
  }

  const gatePasses = await api.get<GatePass[]>(`/visitors/${id}/gate-passes`);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/dashboard/visitors"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to visitors
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{visitor.full_name}</h1>
            <p className="text-sm text-muted-foreground">{visitor.phone ?? "No phone on record"}</p>
          </div>
          <div className="flex items-center gap-3">
            {visitor.is_blacklisted ? (
              <Badge variant="destructive">Blacklisted</Badge>
            ) : (
              <Badge variant="outline">Active</Badge>
            )}
            <VisitorBlacklistActions visitorId={visitor.id} isBlacklisted={visitor.is_blacklisted} />
          </div>
        </div>
        {visitor.is_blacklisted && visitor.blacklist_reason && (
          <p className="mt-2 text-sm text-destructive">Reason: {visitor.blacklist_reason}</p>
        )}
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Gate passes</CardTitle>
            <CardDescription>Issued gate passes for this visitor.</CardDescription>
          </div>
          {!visitor.is_blacklisted && <IssueGatePassDialog visitorId={visitor.id} />}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>OTP code</TableHead>
                <TableHead>Valid from</TableHead>
                <TableHead>Valid until</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gatePasses.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No gate passes yet.
                  </TableCell>
                </TableRow>
              )}
              {gatePasses.map((pass) => (
                <TableRow key={pass.id}>
                  <TableCell className="font-mono">{pass.otp_code}</TableCell>
                  <TableCell>{formatDate(pass.valid_from)}</TableCell>
                  <TableCell>{formatDate(pass.valid_until)}</TableCell>
                  <TableCell>
                    <GatePassStatusBadge status={pass.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
