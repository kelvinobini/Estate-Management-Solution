import { api } from "@/lib/api/server-client";
import { formatDateTime } from "@/lib/format";
import { CreatePatrolLogDialog } from "@/components/access/create-patrol-log-dialog";
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

interface PatrolLog {
  id: string;
  checkpoint_name: string;
  logged_at: string;
  notes: string | null;
}

export default async function ShiftDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const patrolLogs = await api.get<PatrolLog[]>(`/guards/shifts/${id}/patrol-logs`);
  const sortedLogs = [...patrolLogs].sort((a, b) => b.logged_at.localeCompare(a.logged_at));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Patrol log</h1>
        <p className="text-sm text-muted-foreground">Checkpoints logged during this shift.</p>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Checkpoints</CardTitle>
            <CardDescription>Most recent first.</CardDescription>
          </div>
          <CreatePatrolLogDialog shiftId={id} />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Checkpoint</TableHead>
                <TableHead>Logged at</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    No checkpoints logged yet.
                  </TableCell>
                </TableRow>
              )}
              {sortedLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium">{log.checkpoint_name}</TableCell>
                  <TableCell>{formatDateTime(log.logged_at)}</TableCell>
                  <TableCell className="text-muted-foreground">{log.notes ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
