import Link from "next/link";
import { notFound } from "next/navigation";
import { api } from "@/lib/api/server-client";
import { BackendError } from "@/lib/auth/backend";
import { formatDateTime } from "@/lib/format";
import { CreateShiftDialog } from "@/components/access/create-shift-dialog";
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

interface Guard {
  id: string;
  property_id: string;
  user_full_name: string;
  user_email: string;
}

interface Shift {
  id: string;
  shift_start: string;
  shift_end: string;
}

export default async function GuardDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let guard: Guard;
  try {
    guard = await api.get<Guard>(`/guards/${id}`);
  } catch (error) {
    if (error instanceof BackendError && error.status === 404) notFound();
    throw error;
  }

  const shifts = await api.get<Shift[]>(`/guards/${id}/shifts`);
  const sortedShifts = [...shifts].sort((a, b) => b.shift_start.localeCompare(a.shift_start));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href={`/dashboard/properties/${guard.property_id}`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to property
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{guard.user_full_name}</h1>
        <p className="text-sm text-muted-foreground">{guard.user_email}</p>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Shifts</CardTitle>
            <CardDescription>Scheduled duty periods for this guard.</CardDescription>
          </div>
          <CreateShiftDialog guardId={guard.id} />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedShifts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground">
                    No shifts scheduled yet.
                  </TableCell>
                </TableRow>
              )}
              {sortedShifts.map((shift) => (
                <TableRow key={shift.id}>
                  <TableCell>
                    <Link
                      href={`/dashboard/access/shifts/${shift.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {formatDateTime(shift.shift_start)}
                    </Link>
                  </TableCell>
                  <TableCell>{formatDateTime(shift.shift_end)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
