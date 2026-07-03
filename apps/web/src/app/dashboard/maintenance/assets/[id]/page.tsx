import { notFound } from "next/navigation";
import { api } from "@/lib/api/server-client";
import { fetchOrForbidden } from "@/lib/api/safe-fetch";
import { BackendError } from "@/lib/auth/backend";
import { formatDate } from "@/lib/format";
import { AssetStatusSelect } from "@/components/maintenance/asset-status-select";
import { CreateScheduleDialog } from "@/components/maintenance/create-schedule-dialog";
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

interface Asset {
  id: string;
  name: string;
  asset_type: string;
  qr_code: string | null;
  serial_number: string | null;
  installed_at: string | null;
  warranty_expiry: string | null;
  status: string;
}

interface MaintenanceSchedule {
  id: string;
  frequency_days: number;
  last_performed_at: string | null;
  next_due_at: string;
}

interface Vendor {
  id: string;
  company_name: string;
}

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let asset: Asset;
  try {
    asset = await api.get<Asset>(`/assets/${id}`);
  } catch (error) {
    if (error instanceof BackendError && error.status === 404) notFound();
    throw error;
  }

  const [schedules, { data: vendors }] = await Promise.all([
    api.get<MaintenanceSchedule[]>(`/assets/${id}/schedules`),
    fetchOrForbidden(() => api.get<Vendor[]>("/vendors")),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{asset.name}</h1>
          <p className="text-sm text-muted-foreground capitalize">
            {asset.asset_type.replace(/_/g, " ")}
            {asset.qr_code ? ` — QR: ${asset.qr_code}` : ""}
          </p>
        </div>
        <AssetStatusSelect assetId={asset.id} status={asset.status} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Serial number" value={asset.serial_number ?? "—"} />
        <SummaryCard label="Installed" value={asset.installed_at ? formatDate(asset.installed_at) : "—"} />
        <SummaryCard label="Warranty expiry" value={asset.warranty_expiry ? formatDate(asset.warranty_expiry) : "—"} />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Preventive maintenance</CardTitle>
            <CardDescription>Recurring maintenance schedules for this asset.</CardDescription>
          </div>
          <CreateScheduleDialog assetId={asset.id} vendors={vendors ?? []} />
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Frequency</TableHead>
                <TableHead>Last performed</TableHead>
                <TableHead>Next due</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedules.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    No maintenance schedules yet.
                  </TableCell>
                </TableRow>
              )}
              {schedules.map((schedule) => (
                <TableRow key={schedule.id}>
                  <TableCell>Every {schedule.frequency_days} days</TableCell>
                  <TableCell>
                    {schedule.last_performed_at ? formatDate(schedule.last_performed_at) : "Never"}
                  </TableCell>
                  <TableCell>{formatDate(schedule.next_due_at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}
